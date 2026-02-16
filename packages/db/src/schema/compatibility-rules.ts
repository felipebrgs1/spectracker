import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { categories } from "./categories.ts";

export const compatibilityRules = sqliteTable("compatibility_rules", {
	id: text("id").primaryKey(),
	sourceCategoryId: text("source_category_id").references(() => categories.id),
	targetCategoryId: text("target_category_id")
		.notNull()
		.references(() => categories.id),
	ruleType: text("rule_type").notNull(),
	sourceSpecKey: text("source_spec_key").notNull(),
	targetSpecKey: text("target_spec_key").notNull(),
	operator: text("operator").notNull(),
	description: text("description"),
});
