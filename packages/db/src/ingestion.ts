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

const KABUM_CPU_URL = "https://www.kabum.com.br/hardware/processadores";

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

type JsonObject = Record<string, unknown>;

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

function productNodeToOffer(productNode: JsonObject): RawOffer | null {
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

	const availability = getFirstString([
		offersNode && isObject(offersNode) ? offersNode.availability : undefined,
	]);
	const inStock =
		availability === undefined ? undefined : /instock|in_stock|dispon/i.test(availability);

	return {
		store: "kabum",
		categorySlug: "cpu",
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
		},
	};
}

async function fetchKabumCpuOffers(): Promise<RawOffer[]> {
	const response = await fetch(KABUM_CPU_URL, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
			Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		},
	});

	if (!response.ok) {
		throw new Error(`Kabum connector failed with status ${response.status}.`);
	}

	const html = await response.text();
	const jsonLdNodes = collectJsonLdScripts(html);
	const products: JsonObject[] = [];
	for (const node of jsonLdNodes) {
		collectProductNodes(node, products);
	}

	const deduplicated = new Map<string, RawOffer>();
	for (const productNode of products) {
		const parsed = productNodeToOffer(productNode);
		if (!parsed) {
			continue;
		}
		deduplicated.set(parsed.url, parsed);
	}

	return Array.from(deduplicated.values());
}

function toOfferId(store: string, externalId: string | undefined, url: string): string {
	const key = externalId || hashString(url);
	return `offer-${store}-${key}`;
}

export async function syncCpuOffersFromKabum(): Promise<SyncSummary> {
	const startedAt = new Date().toISOString();

	let [cpuCategory] = await db
		.select({
			id: categories.id,
		})
		.from(categories)
		.where(eq(categories.slug, "cpu"))
		.limit(1);

	if (!cpuCategory) {
		const now = new Date().toISOString();
		await db.insert(categories).values({
			id: "cat-cpu",
			name: "CPU",
			slug: "cpu",
			icon: "lucide:cpu",
			sortOrder: 1,
		});

		[cpuCategory] = await db
			.select({
				id: categories.id,
			})
			.from(categories)
			.where(eq(categories.slug, "cpu"))
			.limit(1);

		if (!cpuCategory) {
			throw new Error("Failed to initialize CPU category.");
		}
	}

	const rawOffers = await fetchKabumCpuOffers();
	let upsertedOffers = 0;
	let insertedHistoryPoints = 0;

	for (const rawOffer of rawOffers) {
		const normalizedOffer = normalizeCpuOffer(rawOffer);
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
				categoryId: cpuCategory.id,
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
		category: "cpu",
		totalFetched: rawOffers.length,
		upsertedOffers,
		insertedHistoryPoints,
		startedAt,
		finishedAt,
	};
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
