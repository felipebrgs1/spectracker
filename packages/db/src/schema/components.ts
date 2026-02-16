import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { categories } from "./categories.ts";

export const components = sqliteTable("components", {
	id: text("id").primaryKey(),
	categoryId: text("category_id")
		.notNull()
		.references(() => categories.id),
	name: text("name").notNull(),
	brand: text("brand").notNull(),
	model: text("model").notNull(),
	price: integer("price").notNull().default(0),
	imageUrl: text("image_url"),
	releaseDate: text("release_date"),
	isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const componentSpecs = sqliteTable("component_specs", {
	id: text("id").primaryKey(),
	componentId: text("component_id")
		.notNull()
		.references(() => components.id),
	specKey: text("spec_key").notNull(),
	specValue: text("spec_value").notNull(),
});
