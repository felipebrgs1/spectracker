import { categoriesResponseSchema, componentsResponseSchema } from "@spectracker/contracts";
import {
	builds,
	categories,
	components,
	componentSpecs,
	sourceOffers,
	techpowerupGpuSpecsQueue,
} from "@spectracker/db";
import { and, asc, count, desc, eq, inArray, like, or, sql } from "drizzle-orm";

import { getDb } from "./utils/db";

type JsonObject = Record<string, unknown>;
const DB_QUERY_TIMEOUT_MS = 10000;

type WorkerEnv = {
	DB: {
		prepare: (query: string) => unknown;
	};
};

type GpuCatalogItem = {
	id: string;
	name: string;
	url: string;
	imageUrl: string | null;
	specs: Record<string, string>;
	updatedAt: string;
};

type GpuQueueRow = {
	id: string;
	url: string;
	externalGpuId: string | null;
	gpuName: string | null;
	payloadJson: string | null;
	updatedAt: string;
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json",
		},
	});
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = JSON.parse(value);
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function detectSocketFromText(value: string): string | null {
	const normalized = value.toUpperCase();
	const match = normalized.match(/\b(AM4|AM5|LGA[\s-]?\d{3,4})\b/);
	return match?.[1]?.replace(/\s+/g, " ") ?? null;
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
		match[1]?.replace(",", ".") || "",
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

function parseJson(value: string | null): JsonObject | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = JSON.parse(value);
		return typeof parsed === "object" && parsed !== null ? (parsed as JsonObject) : null;
	} catch {
		return null;
	}
}

function toInt(value: unknown, fallback: number): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return fallback;
}

function extractImageUrl(payload: JsonObject | null): string | null {
	const value = payload?.imageUrl;
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function pickCleanSpecsFromPayload(
	payload: JsonObject | null,
	fallbackName: string,
): Record<string, string> {
	const specs = payload?.normalizedSpecs;
	if (!specs || typeof specs !== "object") {
		return { gpu_name: fallbackName };
	}

	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(specs)) {
		if (typeof value !== "string") {
			continue;
		}
		const cleaned = value.trim();
		if (!cleaned) {
			continue;
		}
		result[key] = cleaned;
	}
	if (!result.gpu_name) {
		result.gpu_name = fallbackName;
	}
	return result;
}

function toCatalogItem(row: GpuQueueRow): GpuCatalogItem | null {
	const payload = parseJson(row.payloadJson);
	const name = row.gpuName || (typeof payload?.name === "string" ? payload.name : null);
	if (!name) {
		return null;
	}
	const specs = pickCleanSpecsFromPayload(payload, name);

	return {
		id: row.id,
		name,
		url: row.url,
		imageUrl: extractImageUrl(payload),
		specs,
		updatedAt: row.updatedAt,
	};
}

async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	operation: string,
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`Operation timed out after ${timeoutMs}ms: ${operation}`));
		}, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	}
}

export default {
	async fetch(request: Request, env: WorkerEnv): Promise<Response> {
		const url = new URL(request.url);
		const db = getDb(env.DB);

		if (url.pathname === "/") {
			return new Response("OK");
		}

		if (request.method === "GET" && url.pathname === "/catalog/categories") {
			const categoryRows = await db
				.select({
					id: categories.id,
					name: categories.name,
					slug: categories.slug,
				})
				.from(categories)
				.orderBy(asc(categories.sortOrder));

			const componentCounts = await db
				.select({
					categoryId: components.categoryId,
					total: count(components.id),
				})
				.from(components)
				.groupBy(components.categoryId);

			const offerCounts = await db
				.select({
					categoryId: sourceOffers.categoryId,
					total: count(sourceOffers.id),
				})
				.from(sourceOffers)
				.groupBy(sourceOffers.categoryId);

			const totalsByCategoryKey = new Map<string, number>();
			for (const row of [...componentCounts, ...offerCounts]) {
				totalsByCategoryKey.set(
					row.categoryId,
					(totalsByCategoryKey.get(row.categoryId) ?? 0) + Number(row.total ?? 0),
				);
			}

			const response = categoryRows.map((row) => {
				const legacyIdKey = `cat-${row.slug}`;
				const categoryKeys = new Set([row.id, row.slug, legacyIdKey]);
				let componentCount = 0;
				for (const key of categoryKeys) {
					componentCount += totalsByCategoryKey.get(key) ?? 0;
				}

				return {
					name: row.name,
					slug: row.slug,
					componentCount,
				};
			});

			return json(categoriesResponseSchema.parse(response));
		}

		if (request.method === "GET" && url.pathname === "/catalog/components") {
			const categorySlug = url.searchParams.get("category") ?? undefined;

			const componentQuery = db
				.select({
					id: components.id,
					name: components.name,
					category: categories.slug,
					price: components.price,
					store: sql<string | null>`null`,
					url: sql<string | null>`null`,
					inStock: sql<boolean>`1`,
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
					or(
						eq(sourceOffers.categoryId, categories.id),
						eq(sourceOffers.categoryId, categories.slug),
					),
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
			return json(
				componentsResponseSchema.parse({
					items: rows.map((row) => ({
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
					})),
					total: rows.length,
				}),
			);
		}

		if (request.method === "GET" && url.pathname === "/dashboard/overview") {
			const [componentTotal] = await db.select({ value: count(components.id) }).from(components);
			const [offerTotal] = await db.select({ value: count(sourceOffers.id) }).from(sourceOffers);
			const [buildTotal] = await db.select({ value: count(builds.id) }).from(builds);
			const [categoryTotal] = await db.select({ value: count(categories.id) }).from(categories);

			return json({
				stats: {
					components: Number(componentTotal?.value ?? 0) + Number(offerTotal?.value ?? 0),
					builds: Number(buildTotal?.value ?? 0),
					categories: Number(categoryTotal?.value ?? 0),
				},
			});
		}

		if (request.method === "GET" && url.pathname === "/gpu-specs") {
			const search = (url.searchParams.get("search") || "").trim();
			const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 120), 1), 200);

			const filters = [eq(techpowerupGpuSpecsQueue.status, "success")];
			if (search.length > 0) {
				const pattern = `%${search}%`;
				filters.push(
					or(
						like(techpowerupGpuSpecsQueue.gpuName, pattern),
						like(techpowerupGpuSpecsQueue.url, pattern),
						like(techpowerupGpuSpecsQueue.externalGpuId, pattern),
					)!,
				);
			}

			try {
				const whereClause = and(...filters);
				const rows = await withTimeout(
					db
						.select({
							id: techpowerupGpuSpecsQueue.id,
							url: techpowerupGpuSpecsQueue.url,
							externalGpuId: techpowerupGpuSpecsQueue.externalGpuId,
							gpuName: techpowerupGpuSpecsQueue.gpuName,
							payloadJson: techpowerupGpuSpecsQueue.payloadJson,
							updatedAt: techpowerupGpuSpecsQueue.updatedAt,
						})
						.from(techpowerupGpuSpecsQueue)
						.where(whereClause)
						.orderBy(desc(techpowerupGpuSpecsQueue.updatedAt))
						.limit(limit),
					DB_QUERY_TIMEOUT_MS,
					"gpu specs list query",
				);

				const items = rows
					.map(toCatalogItem)
					.filter((item): item is GpuCatalogItem => Boolean(item));
				return json({
					items,
					total: items.length,
				});
			} catch (error) {
				console.error("[api/gpu-specs] failed to load catalog", error);
				return json({ message: "Failed to load GPU specs catalog." }, 500);
			}
		}

		const gpuSpecsMatch = url.pathname.match(/^\/gpu-specs\/([^/]+)$/);
		if (request.method === "GET" && gpuSpecsMatch?.[1]) {
			const id = gpuSpecsMatch[1];

			const [row] = await db
				.select()
				.from(techpowerupGpuSpecsQueue)
				.where(eq(techpowerupGpuSpecsQueue.id, id))
				.limit(1);

			if (!row || row.status !== "success") {
				return json({ message: "GPU specs not found" }, 404);
			}

			const payload = parseJson(row.payloadJson);
			const name = row.gpuName || (typeof payload?.name === "string" ? payload.name : row.id);
			return json({
				id: row.id,
				name,
				url: row.url,
				imageUrl: typeof payload?.imageUrl === "string" ? payload.imageUrl : null,
				specs: pickCleanSpecsFromPayload(payload, name),
				updatedAt: row.updatedAt,
			});
		}

		return json({ message: "Not found" }, 404);
	},
};
