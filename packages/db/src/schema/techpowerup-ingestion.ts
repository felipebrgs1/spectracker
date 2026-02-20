import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const techpowerupGpuSpecsQueue = sqliteTable(
	"techpowerup_gpu_specs_queue",
	{
		id: text("id").primaryKey(),
		url: text("url").notNull().unique(),
		externalGpuId: text("external_gpu_id"),
		gpuName: text("gpu_name"),
		status: text("status").notNull().default("pending"), // pending | success | failed | skipped
		attemptCount: integer("attempt_count").notNull().default(0),
		lastError: text("last_error"),
		lastAttemptAt: text("last_attempt_at"),
		completedAt: text("completed_at"),
		payloadJson: text("payload_json"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
	},
	(table) => ({
		statusUpdatedAtIdx: index("techpowerup_gpu_specs_queue_status_updated_at_idx").on(
			table.status,
			table.updatedAt,
		),
	}),
);
