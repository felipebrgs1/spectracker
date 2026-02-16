import { componentsResponseSchema } from "@spectracker/contracts";
import { categories, components, componentSpecs, db, sourceOffers } from "@spectracker/db";
import { asc, eq, inArray, or, sql } from "drizzle-orm";

function parseJsonObject(value: string | null): Record<string, unknown> | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = JSON.parse(value);
		return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
	} catch {
		return null;
	}
}

function detectSocketFromText(value: string): string | null {
	const normalized = value.toUpperCase();
	const match = normalized.match(/\b(AM4|AM5|LGA[\s-]?\d{3,4})\b/);
	return match ? match[1].replace(/\s+/g, " ") : null;
}

function extractCpuModelName(title: string): string | null {
	const clean = title
		.replace(/\bprocessador\b/gi, "")
		.replace(/\bcpu\b/gi, "")
		.replace(/\s+/g, " ")
		.trim();
	const mainPart = clean.split(",")[0]?.trim();
	return mainPart && mainPart.length >= 5 ? mainPart : null;
}

function extractCpuCores(text: string): string | null {
	const numericMatch = text.match(/\b(\d+)\s*(?:núcleos?|cores?)\b/i);
	if (numericMatch?.[1]) {
		return numericMatch[1];
	}
	const namedCoreMap: Record<string, string> = {
		single: "1",
		dual: "2",
		quad: "4",
		hexa: "6",
		octa: "8",
		deca: "10",
		dodeca: "12",
	};
	for (const [token, value] of Object.entries(namedCoreMap)) {
		if (new RegExp(`\\b${token}\\s*core\\b`, "i").test(text)) {
			return value;
		}
	}
	return null;
}

function parseCpuSpecsFromTitle(title: string): Record<string, string> {
	const specs: Record<string, string> = {};
	const normalized = title.replace(/\s+/g, " ").trim();

	const modelName = extractCpuModelName(normalized);
	if (modelName) {
		specs.model_name = modelName;
	}

	const socket = detectSocketFromText(normalized);
	if (socket) {
		specs.socket = socket;
	}

	const clockMatches = Array.from(normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*GHz/gi)).map((match) =>
		match[1].replace(",", "."),
	);
	if (clockMatches[0]) {
		specs.base_clock_ghz = clockMatches[0];
	}
	if (clockMatches[1]) {
		specs.turbo_clock_ghz = clockMatches[1];
	}

	const cacheMatch = normalized.match(/\bcache\s*([\d.,]+\s*(?:mb|kb))\b/i);
	if (cacheMatch?.[1]) {
		specs.cache = cacheMatch[1].toUpperCase();
	}

	const cores = extractCpuCores(normalized);
	if (cores) {
		specs.cores = cores;
	}

	const threadsMatch = normalized.match(/\b(\d+)\s*threads?\b/i);
	if (threadsMatch?.[1]) {
		specs.threads = threadsMatch[1];
	}

	const skuMatch = normalized.match(/-\s*([A-Z0-9-]{6,})\s*$/i);
	if (skuMatch?.[1]) {
		specs.sku = skuMatch[1].toUpperCase();
	}

	return specs;
}

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const categorySlug = typeof query.category === "string" ? query.category : undefined;

	const componentQuery = db
		.select({
			id: components.id,
			name: components.name,
			category: categories.slug,
			price: components.price,
			store: sql<string | null>`null`,
			url: sql<string | null>`null`,
			inStock: true,
			imageUrl: components.imageUrl,
			brand: components.brand,
			model: components.model,
		})
		.from(components)
		.innerJoin(
			categories,
			or(eq(components.categoryId, categories.id), eq(components.categoryId, categories.slug)),
		)
		.orderBy(asc(components.name));

	const offerQuery = db
		.select({
			id: sourceOffers.id,
			name: sourceOffers.title,
			category: categories.slug,
			price: sourceOffers.price,
			store: sourceOffers.store,
			url: sourceOffers.url,
			inStock: sourceOffers.inStock,
			imageUrl: sourceOffers.imageUrl,
			brand: sourceOffers.brand,
			model: sourceOffers.model,
			metaJson: sourceOffers.metaJson,
		})
		.from(sourceOffers)
		.innerJoin(
			categories,
			or(eq(sourceOffers.categoryId, categories.id), eq(sourceOffers.categoryId, categories.slug)),
		)
		.orderBy(asc(sourceOffers.title));

	const componentRows = categorySlug
		? await componentQuery.where(eq(categories.slug, categorySlug))
		: await componentQuery;
	const offerRows = categorySlug
		? await offerQuery.where(eq(categories.slug, categorySlug))
		: await offerQuery;
	const componentIds = componentRows.map((row) => row.id);
	const specsRows =
		componentIds.length > 0
			? await db
					.select({
						componentId: componentSpecs.componentId,
						specKey: componentSpecs.specKey,
						specValue: componentSpecs.specValue,
					})
					.from(componentSpecs)
					.where(inArray(componentSpecs.componentId, componentIds))
			: [];

	const specsByComponentId = new Map<string, Record<string, string>>();
	for (const row of specsRows) {
		const current = specsByComponentId.get(row.componentId) ?? {};
		current[row.specKey] = row.specValue;
		specsByComponentId.set(row.componentId, current);
	}

	const normalizedComponents = componentRows.map((row) => {
		const specs = specsByComponentId.get(row.id) ?? {};
		const socketFromSpecs = specs.socket ?? null;
		return {
			id: row.id,
			name: row.name,
			category: row.category,
			price: row.price ?? 0,
			store: row.store,
			url: row.url,
			inStock: row.inStock,
			imageUrl: row.imageUrl,
			brand: row.brand,
			model: row.model,
			socket: socketFromSpecs || detectSocketFromText(row.name),
			specs,
		};
	});

	const normalizedOffers = offerRows.map((row) => {
		const meta = parseJsonObject(row.metaJson);
		const socketFromMeta = typeof meta?.socket === "string" ? meta.socket : null;
		const parsedSpecs = row.category === "cpu" ? parseCpuSpecsFromTitle(row.name) : {};
		const socket = socketFromMeta || parsedSpecs.socket || detectSocketFromText(row.name);
		const model = parsedSpecs.model_name || row.model;
		const specs = {
			...parsedSpecs,
			...(socket ? { socket } : {}),
		};

		return {
			id: row.id,
			name: row.name,
			category: row.category,
			price: row.price ?? 0,
			store: row.store,
			url: row.url,
			inStock: row.inStock,
			imageUrl: row.imageUrl,
			brand: row.brand,
			model,
			socket,
			specs,
		};
	});

	const rows = [...normalizedComponents, ...normalizedOffers];

	const response = {
		items: rows.map((row) => {
			return {
				id: row.id,
				name: row.name,
				category: row.category,
				price: row.price ?? 0,
				store: row.store,
				url: row.url,
				inStock: row.inStock,
				imageUrl: row.imageUrl,
				brand: row.brand,
				model: row.model,
				socket: row.socket,
				specs: row.specs,
			};
		}),
		total: rows.length,
	};

	return componentsResponseSchema.parse(response);
});
