import { techpowerupGpuSpecsQueue, type AppDatabase } from "@spectracker/db";
import { and, desc, eq, like, or } from "drizzle-orm";
import { DB_QUERY_TIMEOUT_MS, toInt, withTimeout } from "../utils/helpers";

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

export class GpuService {
	constructor(private db: AppDatabase) {}

	private parseJson(value: string | null): Record<string, unknown> | null {
		if (!value) return null;
		try {
			const parsed = JSON.parse(value);
			return typeof parsed === "object" && parsed !== null
				? (parsed as Record<string, unknown>)
				: null;
		} catch {
			return null;
		}
	}

	private extractImageUrl(payload: Record<string, unknown> | null): string | null {
		const value = payload?.imageUrl;
		return typeof value === "string" && value.trim().length > 0 ? value : null;
	}

	private pickCleanSpecsFromPayload(
		payload: Record<string, unknown> | null,
		fallbackName: string,
	): Record<string, string> {
		const specs = payload?.normalizedSpecs;
		if (!specs || typeof specs !== "object") {
			return { gpu_name: fallbackName };
		}

		const result: Record<string, string> = {};
		for (const [key, value] of Object.entries(specs)) {
			if (typeof value !== "string") continue;
			const cleaned = value.trim();
			if (!cleaned) continue;
			result[key] = cleaned;
		}
		if (!result.gpu_name) {
			result.gpu_name = fallbackName;
		}
		return result;
	}

	private toCatalogItem(row: GpuQueueRow): GpuCatalogItem | null {
		const payload = this.parseJson(row.payloadJson);
		const name = row.gpuName || (typeof payload?.name === "string" ? payload.name : null);
		if (!name) return null;
		const specs = this.pickCleanSpecsFromPayload(payload, name);

		return {
			id: row.id,
			name,
			url: row.url,
			imageUrl: this.extractImageUrl(payload),
			specs,
			updatedAt: row.updatedAt,
		};
	}

	async getGpuSpecs(searchStr: string = "", limitValue: string | number = 120) {
		const search = searchStr.trim();
		const limit = Math.min(Math.max(toInt(limitValue, 120), 1), 200);

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

		const whereClause = and(...filters);
		const rows = await withTimeout(
			this.db
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

		return rows
			.map((row) => this.toCatalogItem(row as GpuQueueRow))
			.filter((item): item is GpuCatalogItem => Boolean(item));
	}

	async getGpuDetail(id: string) {
		const [row] = await this.db
			.select()
			.from(techpowerupGpuSpecsQueue)
			.where(eq(techpowerupGpuSpecsQueue.id, id))
			.limit(1);

		if (!row || row.status !== "success") {
			return null;
		}

		const payload = this.parseJson(row.payloadJson);
		const name = row.gpuName || (typeof payload?.name === "string" ? payload.name : row.id);
		return {
			id: row.id,
			name,
			url: row.url,
			imageUrl: typeof payload?.imageUrl === "string" ? payload.imageUrl : null,
			specs: this.pickCleanSpecsFromPayload(payload, name),
			updatedAt: row.updatedAt,
		};
	}
}
