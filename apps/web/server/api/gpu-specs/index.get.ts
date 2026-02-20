import { db, techpowerupGpuSpecsQueue } from "@spectracker/db";
import { and, desc, eq, like, or } from "drizzle-orm";
import { pickCleanSpecsFromPayload } from "../../utils/gpu-specs";

type JsonObject = Record<string, unknown>;
const DB_QUERY_TIMEOUT_MS = 10000;

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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
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

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const search = typeof query.search === "string" ? query.search.trim() : "";
	const limit = Math.min(Math.max(toInt(query.limit, 120), 1), 200);

	const filters = [eq(techpowerupGpuSpecsQueue.status, "success")];
	if (search.length > 0) {
		const pattern = `%${search}%`;
		filters.push(
			or(
				like(techpowerupGpuSpecsQueue.gpuName, pattern),
				like(techpowerupGpuSpecsQueue.url, pattern),
				like(techpowerupGpuSpecsQueue.externalGpuId, pattern),
			),
		);
	}

	try {
		const whereClause = and(...filters);
		const queryStartedAt = Date.now();
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
		const queryDurationMs = Date.now() - queryStartedAt;
		if (queryDurationMs > 2000) {
			console.warn(
				`[api/gpu-specs] slow query (${queryDurationMs}ms) search="${search}" limit=${limit} rows=${rows.length}`,
			);
		}

		const items = rows.map(toCatalogItem).filter((item): item is GpuCatalogItem => Boolean(item));
		return {
			items,
			total: items.length,
		};
	} catch (error) {
		console.error("[api/gpu-specs] failed to load catalog", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		const isTimeout = message.includes("timed out");
		throw createError({
			statusCode: isTimeout ? 504 : 500,
			statusMessage: isTimeout
				? "GPU specs query timed out. Try with a lower limit or add DB index."
				: "Failed to load GPU specs catalog.",
		});
	}
});
