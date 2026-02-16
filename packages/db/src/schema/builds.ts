import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { components } from "./components";

export const builds = sqliteTable("builds", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	totalPrice: integer("total_price").notNull().default(0),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
});

export const buildItems = sqliteTable("build_items", {
	id: text("id").primaryKey(),
	buildId: text("build_id")
		.notNull()
		.references(() => builds.id),
	componentId: text("component_id")
		.notNull()
		.references(() => components.id),
	quantity: integer("quantity").notNull().default(1),
});
