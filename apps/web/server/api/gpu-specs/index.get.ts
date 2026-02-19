import { db, techpowerupGpuSpecsQueue } from "@spectracker/db";
import { and, desc, eq, like, or } from "drizzle-orm";
import { pickCleanSpecsFromPayload } from "../../utils/gpu-specs";

type JsonObject = Record<string, unknown>;

type GpuCatalogItem = {
	id: string;
	name: string;
	url: string;
	imageUrl: string | null;
	specs: Record<string, string>;
	updatedAt: string;
};

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

function toCatalogItem(row: typeof techpowerupGpuSpecsQueue.$inferSelect): GpuCatalogItem | null {
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
	const limit = Math.min(Math.max(toInt(query.limit, 120), 1), 500);

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

	const whereClause = and(...filters);
	const rows = await db
		.select()
		.from(techpowerupGpuSpecsQueue)
		.where(whereClause)
		.orderBy(desc(techpowerupGpuSpecsQueue.updatedAt))
		.limit(limit);

	const items = rows.map(toCatalogItem).filter((item): item is GpuCatalogItem => Boolean(item));
	return {
		items,
		total: items.length,
	};
});
