import type { RawOffer } from "../types";
import { extractKabumProductId, parsePriceToCents } from "../utils";

const KABUM_CPU_URL = "https://www.kabum.com.br/hardware/processadores";
const TARGET_CPU_SOCKETS = [
	{ label: "AM4", pattern: /\bam4\b/i },
	{ label: "AM5", pattern: /\bam5\b/i },
	{ label: "LGA 1700", pattern: /\blga[\s-]?1700\b/i },
	{ label: "LGA 1851", pattern: /\blga[\s-]?1851\b/i },
] as const;

type JsonObject = Record<string, unknown>;

function toArray<T>(value: T | T[] | undefined): T[] {
	if (!value) {
		return [];
	}
	return Array.isArray(value) ? value : [value];
}

function detectTargetCpuSocket(title: string): string | null {
	for (const socket of TARGET_CPU_SOCKETS) {
		if (socket.pattern.test(title)) {
			return socket.label;
		}
	}
	return null;
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

	const nodeType = value["@type"];
	if (nodeType === "Product") {
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

function parseKabumProductsFromNextData(html: string): RawOffer[] {
	const nextDataMatch = html.match(
		/<script id=["']__NEXT_DATA__["'] type=["']application\/json["']>([\s\S]*?)<\/script>/i,
	);
	if (!nextDataMatch?.[1]) {
		return [];
	}

	const nextData = safeJsonParse(nextDataMatch[1]);
	if (!isObject(nextData)) {
		return [];
	}

	const pageProps = nextData.props;
	if (!isObject(pageProps) || !isObject(pageProps.pageProps)) {
		return [];
	}

	const innerDataRaw = pageProps.pageProps.data;
	if (typeof innerDataRaw !== "string") {
		return [];
	}

	const innerData = safeJsonParse(innerDataRaw);
	if (!isObject(innerData) || !isObject(innerData.catalogServer)) {
		return [];
	}

	const products = innerData.catalogServer.data;
	if (!Array.isArray(products)) {
		return [];
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

		const socket = detectTargetCpuSocket(title);
		if (!socket) {
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
			categorySlug: "cpu",
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
				socket,
				seller: sellerName || null,
			},
		});
	}

	return offers;
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

	const socket = detectTargetCpuSocket(title);
	if (!socket) {
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
			socket,
		},
	};
}

export async function fetchKabumCpuOffers(): Promise<RawOffer[]> {
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
	const offersFromNextData = parseKabumProductsFromNextData(html);
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

	for (const offer of offersFromNextData) {
		deduplicated.set(offer.url, offer);
	}

	return Array.from(deduplicated.values());
}
