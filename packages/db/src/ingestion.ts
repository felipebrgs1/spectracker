import { and, desc, eq } from "drizzle-orm";

import { db } from "./index";
import { categories } from "./schema/categories";
import { priceHistory, sourceOffers } from "./schema/ingestion";

type RawOffer = {
	store: string;
	categorySlug: string;
	title: string;
	url: string;
	priceCents: number;
	currency?: string;
	externalId?: string;
	imageUrl?: string;
	inStock?: boolean;
	stockText?: string;
	meta?: Record<string, unknown>;
};

type NormalizedOffer = RawOffer & {
	normalizedName: string;
	brand: string | null;
	model: string | null;
};

export type SyncSummary = {
	source: string;
	category: string;
	totalFetched: number;
	upsertedOffers: number;
	insertedHistoryPoints: number;
	startedAt: string;
	finishedAt: string;
};

type JsonObject = Record<string, unknown>;

type KabumCategoryConfig = {
	slug: "cpu" | "gpu" | "ram";
	name: string;
	icon: string;
	sortOrder: number;
	url: string;
	matchTitle: (title: string) => Record<string, unknown> | null;
	normalizeOffer: (offer: RawOffer) => NormalizedOffer;
};

const KABUM_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
	Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const TARGET_CPU_SOCKETS = [
	{ label: "AM4", pattern: /\bam4\b/i },
	{ label: "AM5", pattern: /\bam5\b/i },
	{ label: "LGA 1700", pattern: /\blga[\s-]?1700\b/i },
	{ label: "LGA 1851", pattern: /\blga[\s-]?1851\b/i },
] as const;

const RAM_BRANDS = [
	"Corsair",
	"Kingston",
	"Crucial",
	"G.Skill",
	"GSkill",
	"TeamGroup",
	"XPG",
	"ADATA",
	"Patriot",
	"Geil",
	"Acer",
	"Pichau",
];

function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value: string): string {
	return normalizeWhitespace(value).toLowerCase();
}

function hashString(value: string): string {
	let hash = 5381;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 33) ^ value.charCodeAt(index);
	}
	return Math.abs(hash >>> 0).toString(36);
}

function extractKabumProductId(url: string): string | undefined {
	const match = url.match(/\/produto\/(\d+)\//i);
	return match?.[1];
}

function parsePriceToCents(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.round(value * 100);
	}

	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	const normalized = trimmed
		.replace(/[R$\s]/g, "")
		.replace(/\.(?=\d{3}(?:\D|$))/g, "")
		.replace(",", ".");

	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function randomId(prefix: string): string {
	const randomPart = Math.random().toString(36).slice(2, 10);
	const timestampPart = Date.now().toString(36);
	return `${prefix}-${timestampPart}-${randomPart}`;
}

function detectTargetCpuSocket(title: string): string | null {
	for (const socket of TARGET_CPU_SOCKETS) {
		if (socket.pattern.test(title)) {
			return socket.label;
		}
	}
	return null;
}

function matchGpuTarget(title: string): Record<string, unknown> | null {
	const normalized = normalizeSearchText(title);
	const nvidiaMatch = normalized.match(/\brtx[\s-]?([345]\d{3})\b/i);
	if (nvidiaMatch?.[1]) {
		const chip = nvidiaMatch[1];
		const seriesDigit = chip.charAt(0);
		return {
			vendor: "NVIDIA",
			line: "RTX",
			chip,
			series: `${seriesDigit}000`,
		};
	}

	const amdMatch = normalized.match(/\brx[\s-]?([6-9]\d{3})\b/i);
	if (amdMatch?.[1]) {
		const chip = amdMatch[1];
		const seriesDigit = chip.charAt(0);
		const seriesNumber = Number.parseInt(seriesDigit, 10);
		if (Number.isFinite(seriesNumber) && seriesNumber >= 6) {
			return {
				vendor: "AMD",
				line: "RX",
				chip,
				series: `${seriesDigit}000`,
			};
		}
	}

	return null;
}

function matchRamTarget(title: string): Record<string, unknown> | null {
	const match = title.match(/\bddr\s*([45])\b/i);
	if (!match?.[1]) {
		return null;
	}

	return {
		generation: `DDR${match[1]}`,
	};
}

function detectCpuBrand(title: string): string | null {
	const normalized = normalizeSearchText(title);
	if (normalized.includes("amd") || normalized.includes("ryzen")) {
		return "AMD";
	}
	if (
		normalized.includes("intel") ||
		normalized.includes("core i") ||
		normalized.includes("celeron") ||
		normalized.includes("pentium")
	) {
		return "Intel";
	}
	return null;
}

function detectGpuBrand(title: string): string | null {
	const normalized = normalizeSearchText(title);
	if (/\brtx[\s-]?[345]\d{3}\b/i.test(normalized)) {
		return "NVIDIA";
	}
	if (/\brx[\s-]?[6-9]\d{3}\b/i.test(normalized)) {
		return "AMD";
	}
	if (
		normalized.includes("nvidia") ||
		normalized.includes("geforce") ||
		normalized.includes("rtx")
	) {
		return "NVIDIA";
	}
	if (normalized.includes("amd") || normalized.includes("radeon")) {
		return "AMD";
	}
	return null;
}

function detectRamBrand(title: string): string | null {
	const normalized = normalizeSearchText(title);
	for (const brand of RAM_BRANDS) {
		if (normalized.includes(brand.toLowerCase())) {
			return brand;
		}
	}
	return null;
}

function extractCpuModel(title: string, brand: string | null): string | null {
	let model = normalizeWhitespace(title);
	model = model.replace(/\bprocessador\b/gi, "");
	model = model.replace(/\bcpu\b/gi, "");

	if (brand) {
		const brandPattern = new RegExp(`\\b${brand}\\b`, "gi");
		model = model.replace(brandPattern, "");
	}

	model = model.replace(/\b(amd|intel)\b/gi, "");
	model = model.replace(/\s+-\s+/g, " ");
	model = normalizeWhitespace(model);

	return model.length > 2 ? model : null;
}

function extractGpuModel(title: string, brand: string | null): string | null {
	let model = normalizeWhitespace(title);
	model = model.replace(/\bplaca\s+de\s+video\b/gi, "");
	model = model.replace(/\bvga\b/gi, "");
	model = model.replace(/\bgpu\b/gi, "");
	model = model.replace(/\bgeforce\b/gi, "");
	model = model.replace(/\bradeon\b/gi, "");

	if (brand) {
		const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const brandPattern = new RegExp(`\\b${escapedBrand}\\b`, "gi");
		model = model.replace(brandPattern, "");
	}

	model = model.replace(/\s+-\s+/g, " ");
	model = normalizeWhitespace(model);

	return model.length > 2 ? model : null;
}

function extractRamModel(title: string, brand: string | null): string | null {
	let model = normalizeWhitespace(title);
	model = model.replace(/\bmem[oó]ria\s+ram\b/gi, "");
	model = model.replace(/\bram\b/gi, "");

	if (brand) {
		const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const brandPattern = new RegExp(`\\b${escapedBrand}\\b`, "gi");
		model = model.replace(brandPattern, "");
	}

	model = model.replace(/\s+-\s+/g, " ");
	model = normalizeWhitespace(model);

	return model.length > 2 ? model : null;
}

function normalizeCpuOffer(rawOffer: RawOffer): NormalizedOffer {
	const normalizedName = normalizeWhitespace(rawOffer.title);
	const brand = detectCpuBrand(normalizedName);
	const model = extractCpuModel(normalizedName, brand);

	return {
		...rawOffer,
		normalizedName,
		brand,
		model,
	};
}

function normalizeGpuOffer(rawOffer: RawOffer): NormalizedOffer {
	const normalizedName = normalizeWhitespace(rawOffer.title);
	const brand = detectGpuBrand(normalizedName);
	const model = extractGpuModel(normalizedName, brand);

	return {
		...rawOffer,
		normalizedName,
		brand,
		model,
	};
}

function normalizeRamOffer(rawOffer: RawOffer): NormalizedOffer {
	const normalizedName = normalizeWhitespace(rawOffer.title);
	const brand = detectRamBrand(normalizedName);
	const model = extractRamModel(normalizedName, brand);

	return {
		...rawOffer,
		normalizedName,
		brand,
		model,
	};
}

const KABUM_CATEGORIES: Record<KabumCategoryConfig["slug"], KabumCategoryConfig> = {
	cpu: {
		slug: "cpu",
		name: "CPU",
		icon: "lucide:cpu",
		sortOrder: 1,
		url: "https://www.kabum.com.br/hardware/processadores",
		matchTitle: (title) => {
			const socket = detectTargetCpuSocket(title);
			return socket ? { socket } : null;
		},
		normalizeOffer: normalizeCpuOffer,
	},
	gpu: {
		slug: "gpu",
		name: "GPU",
		icon: "lucide:monitor",
		sortOrder: 2,
		url: "https://www.kabum.com.br/hardware/placa-de-video-vga",
		matchTitle: matchGpuTarget,
		normalizeOffer: normalizeGpuOffer,
	},
	ram: {
		slug: "ram",
		name: "RAM",
		icon: "lucide:memory-stick",
		sortOrder: 4,
		url: "https://www.kabum.com.br/hardware/memoria-ram",
		matchTitle: matchRamTarget,
		normalizeOffer: normalizeRamOffer,
	},
};

function toArray<T>(value: T | T[] | undefined): T[] {
	if (!value) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

function safeJsonParse(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function collectJsonLdScripts(html: string): unknown[] {
	const scripts: unknown[] = [];
	const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

	for (const match of html.matchAll(regex)) {
		const content = match[1];
		if (!content) {
			continue;
		}

		const parsed = safeJsonParse(content.trim());
		if (parsed) {
			scripts.push(parsed);
		}
	}

	return scripts;
}

function isObject(value: unknown): value is JsonObject {
	return typeof value === "object" && value !== null;
}

function collectProductNodes(value: unknown, output: JsonObject[]): void {
	if (Array.isArray(value)) {
		for (const item of value) {
			collectProductNodes(item, output);
		}
		return;
	}

	if (!isObject(value)) {
		return;
	}

	if (value["@type"] === "Product") {
		output.push(value);
	}

	for (const nestedValue of Object.values(value)) {
		collectProductNodes(nestedValue, output);
	}
}

function getFirstString(values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim();
		}
	}
	return undefined;
}

type ParsedKabumPage = {
	offers: RawOffer[];
	productCount: number;
	pageSize: number | null;
	currentPage: number | null;
	totalPages: number | null;
};

function parseInteger(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === "string" && value.trim().length > 0) {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function detectTotalPagesFromPagination(pagination: unknown): number | null {
	if (!isObject(pagination)) {
		return null;
	}

	const candidates = [
		pagination.totalPages,
		pagination.total_pages,
		pagination.lastPage,
		pagination.last_page,
		pagination.pages,
		pagination.pageCount,
		pagination.page_count,
	];

	for (const candidate of candidates) {
		const value = parseInteger(candidate);
		if (value && value > 0) {
			return value;
		}
	}

	return null;
}

function detectTotalPagesFromLinks(links: unknown): number | null {
	if (!Array.isArray(links)) {
		return null;
	}

	let maxPage = 0;
	for (const link of links) {
		if (!isObject(link)) {
			continue;
		}

		const pageFromField = parseInteger(link.page);
		if (pageFromField && pageFromField > maxPage) {
			maxPage = pageFromField;
		}

		const href = getFirstString([link.href, link.url]);
		if (!href) {
			continue;
		}

		try {
			const parsedUrl = new URL(href, "https://www.kabum.com.br");
			const pageFromQuery = parseInteger(parsedUrl.searchParams.get("page_number"));
			if (pageFromQuery && pageFromQuery > maxPage) {
				maxPage = pageFromQuery;
			}
		} catch {
			continue;
		}
	}

	return maxPage > 0 ? maxPage : null;
}

function parseKabumProductsFromNextData(html: string, config: KabumCategoryConfig): ParsedKabumPage {
	const nextDataMatch = html.match(
		/<script id=["']__NEXT_DATA__["'] type=["']application\/json["']>([\s\S]*?)<\/script>/i,
	);
	if (!nextDataMatch?.[1]) {
		return {
			offers: [],
			productCount: 0,
			pageSize: null,
			currentPage: null,
			totalPages: null,
		};
	}

	const nextData = safeJsonParse(nextDataMatch[1]);
	if (!isObject(nextData)) {
		return {
			offers: [],
			productCount: 0,
			pageSize: null,
			currentPage: null,
			totalPages: null,
		};
	}

	const pageProps = nextData.props;
	if (!isObject(pageProps) || !isObject(pageProps.pageProps)) {
		return {
			offers: [],
			productCount: 0,
			pageSize: null,
			currentPage: null,
			totalPages: null,
		};
	}

	const innerDataRaw = pageProps.pageProps.data;
	if (typeof innerDataRaw !== "string") {
		return {
			offers: [],
			productCount: 0,
			pageSize: null,
			currentPage: null,
			totalPages: null,
		};
	}

	const innerData = safeJsonParse(innerDataRaw);
	if (!isObject(innerData) || !isObject(innerData.catalogServer)) {
		return {
			offers: [],
			productCount: 0,
			pageSize: null,
			currentPage: null,
			totalPages: null,
		};
	}

	const products = innerData.catalogServer.data;
	if (!Array.isArray(products)) {
		return {
			offers: [],
			productCount: 0,
			pageSize: null,
			currentPage: null,
			totalPages: null,
		};
	}

	const offers: RawOffer[] = [];
	for (const product of products) {
		if (!isObject(product)) {
			continue;
		}

		const title = getFirstString([product.name]);
		if (!title) {
			continue;
		}

		const matchMeta = config.matchTitle(title);
		if (!matchMeta) {
			continue;
		}

		const sellerName = getFirstString([product.sellerName]);
		if (sellerName && !/kabum/i.test(sellerName)) {
			continue;
		}

		const code = getFirstString([product.code ? String(product.code) : undefined]);
		const slug = getFirstString([product.friendlyName]);
		const url = getFirstString([
			product.externalUrl,
			code && slug ? `https://www.kabum.com.br/produto/${code}/${slug}` : undefined,
		]);
		const rawPrice = getFirstString([
			typeof product.priceWithDiscount === "number"
				? String(product.priceWithDiscount)
				: product.priceWithDiscount,
			typeof product.price === "number" ? String(product.price) : product.price,
		]);
		const priceCents = parsePriceToCents(rawPrice);
		if (!url || priceCents === null) {
			continue;
		}

		const imageUrl = getFirstString([
			product.image,
			product.thumbnail,
			Array.isArray(product.images) ? product.images[0] : undefined,
		]);
		const inStock =
			typeof product.available === "boolean"
				? product.available
				: typeof product.quantity === "number"
					? product.quantity > 0
					: undefined;

		offers.push({
			store: "kabum",
			categorySlug: config.slug,
			title,
			url,
			priceCents,
			currency: "BRL",
			externalId: code || extractKabumProductId(url),
			imageUrl,
			inStock,
			stockText: inStock === undefined ? undefined : inStock ? "InStock" : "OutOfStock",
			meta: {
				source: "next-data",
				seller: sellerName || null,
				...matchMeta,
			},
		});
	}

	const pageSize = parseInteger(innerData.params && isObject(innerData.params) ? innerData.params.page_size : null);
	const currentPage = parseInteger(
		innerData.params && isObject(innerData.params) ? innerData.params.page_number : null,
	);
	const totalPages =
		detectTotalPagesFromPagination(innerData.catalogServer.pagination) ??
		detectTotalPagesFromLinks(innerData.catalogServer.links);

	return {
		offers,
		productCount: products.length,
		pageSize: pageSize && pageSize > 0 ? pageSize : null,
		currentPage: currentPage && currentPage > 0 ? currentPage : null,
		totalPages,
	};
}

function productNodeToOffer(
	productNode: JsonObject,
	config: KabumCategoryConfig,
): RawOffer | null {
	const offersNode = toArray(productNode.offers).find((entry) => isObject(entry));
	const imageValue = productNode.image;
	const imageUrl = Array.isArray(imageValue)
		? getFirstString(imageValue)
		: typeof imageValue === "string"
			? imageValue
			: undefined;

	const title = getFirstString([productNode.name, productNode.title]);
	const url = getFirstString([
		offersNode && isObject(offersNode) ? offersNode.url : undefined,
		productNode.url,
	]);
	const rawPrice = getFirstString([
		offersNode && isObject(offersNode) ? offersNode.price : undefined,
		typeof productNode.price === "number" ? String(productNode.price) : productNode.price,
	]);
	const priceCents = parsePriceToCents(rawPrice);

	if (!title || !url || priceCents === null) {
		return null;
	}

	const matchMeta = config.matchTitle(title);
	if (!matchMeta) {
		return null;
	}

	const availability = getFirstString([
		offersNode && isObject(offersNode) ? offersNode.availability : undefined,
	]);
	const inStock =
		availability === undefined ? undefined : /instock|in_stock|dispon/i.test(availability);

	return {
		store: "kabum",
		categorySlug: config.slug,
		title,
		url,
		priceCents,
		currency: "BRL",
		externalId: extractKabumProductId(url),
		imageUrl,
		inStock,
		stockText: availability,
		meta: {
			source: "json-ld",
			...matchMeta,
		},
	};
}

async function fetchKabumOffers(config: KabumCategoryConfig): Promise<RawOffer[]> {
	const deduplicated = new Map<string, RawOffer>();
	const maxPagesRaw = Number.parseInt(process.env.INGESTION_KABUM_MAX_PAGES || "", 10);
	const maxPages =
		Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? Math.min(maxPagesRaw, 200) : 25;

	let currentPage = 1;
	let discoveredTotalPages: number | null = null;

	while (currentPage <= maxPages && (discoveredTotalPages === null || currentPage <= discoveredTotalPages)) {
		const pageUrl = new URL(config.url);
		pageUrl.searchParams.set("page_number", String(currentPage));

		const response = await fetch(pageUrl.toString(), {
			headers: KABUM_HEADERS,
		});

		if (!response.ok) {
			if (currentPage === 1) {
				throw new Error(`Kabum ${config.slug} connector failed with status ${response.status}.`);
			}
			break;
		}

		const html = await response.text();
		const nextDataPage = parseKabumProductsFromNextData(html, config);
		if (nextDataPage.totalPages && nextDataPage.totalPages > 0) {
			discoveredTotalPages = Math.min(nextDataPage.totalPages, maxPages);
		}

		const jsonLdNodes = collectJsonLdScripts(html);
		const products: JsonObject[] = [];
		for (const node of jsonLdNodes) {
			collectProductNodes(node, products);
		}

		let pageOfferCount = 0;
		for (const productNode of products) {
			const parsed = productNodeToOffer(productNode, config);
			if (!parsed) {
				continue;
			}
			deduplicated.set(parsed.url, parsed);
			pageOfferCount += 1;
		}

		for (const offer of nextDataPage.offers) {
			deduplicated.set(offer.url, offer);
			pageOfferCount += 1;
		}

		if (nextDataPage.productCount === 0 || pageOfferCount === 0) {
			break;
		}

		if (!discoveredTotalPages && nextDataPage.pageSize && nextDataPage.productCount < nextDataPage.pageSize) {
			break;
		}

		currentPage += 1;
	}

	return Array.from(deduplicated.values());
}

function toOfferId(store: string, externalId: string | undefined, url: string): string {
	const key = externalId || hashString(url);
	return `offer-${store}-${key}`;
}

async function ensureCategory(config: KabumCategoryConfig): Promise<{ id: string }> {
	let [category] = await db
		.select({
			id: categories.id,
		})
		.from(categories)
		.where(eq(categories.slug, config.slug))
		.limit(1);

	if (!category) {
		await db.insert(categories).values({
			id: `cat-${config.slug}`,
			name: config.name,
			slug: config.slug,
			icon: config.icon,
			sortOrder: config.sortOrder,
		});

		[category] = await db
			.select({
				id: categories.id,
			})
			.from(categories)
			.where(eq(categories.slug, config.slug))
			.limit(1);

		if (!category) {
			throw new Error(`Failed to initialize ${config.slug.toUpperCase()} category.`);
		}
	}

	return category;
}

async function syncKabumCategory(config: KabumCategoryConfig): Promise<SyncSummary> {
	const startedAt = new Date().toISOString();
	const category = await ensureCategory(config);

	const rawOffers = await fetchKabumOffers(config);
	let upsertedOffers = 0;
	let insertedHistoryPoints = 0;

	for (const rawOffer of rawOffers) {
		const normalizedOffer = config.normalizeOffer(rawOffer);
		const now = new Date().toISOString();
		const offerId = toOfferId(
			normalizedOffer.store,
			normalizedOffer.externalId,
			normalizedOffer.url,
		);

		await db
			.insert(sourceOffers)
			.values({
				id: offerId,
				store: normalizedOffer.store,
				externalId: normalizedOffer.externalId,
				categoryId: category.id,
				componentId: null,
				title: normalizedOffer.title,
				normalizedName: normalizedOffer.normalizedName,
				brand: normalizedOffer.brand,
				model: normalizedOffer.model,
				price: normalizedOffer.priceCents,
				currency: normalizedOffer.currency || "BRL",
				inStock: normalizedOffer.inStock ?? true,
				stockText: normalizedOffer.stockText,
				url: normalizedOffer.url,
				imageUrl: normalizedOffer.imageUrl,
				metaJson: normalizedOffer.meta ? JSON.stringify(normalizedOffer.meta) : null,
				lastSeenAt: now,
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoUpdate({
				target: sourceOffers.id,
				set: {
					externalId: normalizedOffer.externalId,
					title: normalizedOffer.title,
					normalizedName: normalizedOffer.normalizedName,
					brand: normalizedOffer.brand,
					model: normalizedOffer.model,
					price: normalizedOffer.priceCents,
					currency: normalizedOffer.currency || "BRL",
					inStock: normalizedOffer.inStock ?? true,
					stockText: normalizedOffer.stockText,
					url: normalizedOffer.url,
					imageUrl: normalizedOffer.imageUrl,
					metaJson: normalizedOffer.meta ? JSON.stringify(normalizedOffer.meta) : null,
					lastSeenAt: now,
					updatedAt: now,
				},
			});
		upsertedOffers += 1;

		const [latestPrice] = await db
			.select({
				price: priceHistory.price,
				currency: priceHistory.currency,
				inStock: priceHistory.inStock,
			})
			.from(priceHistory)
			.where(eq(priceHistory.sourceOfferId, offerId))
			.orderBy(desc(priceHistory.capturedAt))
			.limit(1);

		const hasPriceChanged =
			!latestPrice ||
			latestPrice.price !== normalizedOffer.priceCents ||
			latestPrice.currency !== (normalizedOffer.currency || "BRL") ||
			latestPrice.inStock !== (normalizedOffer.inStock ?? true);

		if (!hasPriceChanged) {
			continue;
		}

		await db.insert(priceHistory).values({
			id: randomId("ph"),
			sourceOfferId: offerId,
			price: normalizedOffer.priceCents,
			currency: normalizedOffer.currency || "BRL",
			inStock: normalizedOffer.inStock ?? true,
			capturedAt: now,
		});
		insertedHistoryPoints += 1;
	}

	const finishedAt = new Date().toISOString();
	return {
		source: "kabum",
		category: config.slug,
		totalFetched: rawOffers.length,
		upsertedOffers,
		insertedHistoryPoints,
		startedAt,
		finishedAt,
	};
}

export async function syncCpuOffersFromKabum(): Promise<SyncSummary> {
	return syncKabumCategory(KABUM_CATEGORIES.cpu);
}

export async function syncGpuOffersFromKabum(): Promise<SyncSummary> {
	return syncKabumCategory(KABUM_CATEGORIES.gpu);
}

export async function syncRamOffersFromKabum(): Promise<SyncSummary> {
	return syncKabumCategory(KABUM_CATEGORIES.ram);
}

export async function syncCoreComponentOffersFromKabum(): Promise<SyncSummary[]> {
	const summaries: SyncSummary[] = [];
	for (const config of [KABUM_CATEGORIES.cpu, KABUM_CATEGORIES.gpu, KABUM_CATEGORIES.ram]) {
		summaries.push(await syncKabumCategory(config));
	}
	return summaries;
}

export async function getLatestSourceOffers(store: string, categorySlug: string) {
	return db
		.select({
			id: sourceOffers.id,
			store: sourceOffers.store,
			title: sourceOffers.title,
			price: sourceOffers.price,
			currency: sourceOffers.currency,
			inStock: sourceOffers.inStock,
			url: sourceOffers.url,
			updatedAt: sourceOffers.updatedAt,
		})
		.from(sourceOffers)
		.innerJoin(categories, eq(categories.id, sourceOffers.categoryId))
		.where(and(eq(sourceOffers.store, store), eq(categories.slug, categorySlug)))
		.orderBy(sourceOffers.price);
}
