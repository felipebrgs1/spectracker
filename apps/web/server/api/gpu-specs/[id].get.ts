import { db, techpowerupGpuSpecsQueue } from "@spectracker/db";
import { eq } from "drizzle-orm";
import { pickCleanSpecsFromPayload } from "../../utils/gpu-specs";

type JsonObject = Record<string, unknown>;

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

export default defineEventHandler(async (event) => {
	const id = getRouterParam(event, "id");
	if (!id) {
		throw createError({ statusCode: 400, statusMessage: "Missing id" });
	}

	const [row] = await db
		.select()
		.from(techpowerupGpuSpecsQueue)
		.where(eq(techpowerupGpuSpecsQueue.id, id))
		.limit(1);

	if (!row || row.status !== "success") {
		throw createError({ statusCode: 404, statusMessage: "GPU specs not found" });
	}

	const payload = parseJson(row.payloadJson);
	const name = row.gpuName || (typeof payload?.name === "string" ? payload.name : row.id);
	return {
		id: row.id,
		name,
		url: row.url,
		imageUrl: typeof payload?.imageUrl === "string" ? payload.imageUrl : null,
		specs: pickCleanSpecsFromPayload(payload, name),
		updatedAt: row.updatedAt,
	};
});
