import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { categories } from "./categories";
import { components } from "./components";

export const sourceOffers = sqliteTable("source_offers", {
	id: text("id").primaryKey(),
	store: text("store").notNull(),
	externalId: text("external_id"),
	categoryId: text("category_id")
		.notNull()
		.references(() => categories.id),
	componentId: text("component_id").references(() => components.id),
	title: text("title").notNull(),
	normalizedName: text("normalized_name").notNull(),
	brand: text("brand"),
	model: text("model"),
	price: integer("price").notNull(),
	currency: text("currency").notNull().default("BRL"),
	inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
	stockText: text("stock_text"),
	url: text("url").notNull(),
	imageUrl: text("image_url"),
	metaJson: text("meta_json"),
	lastSeenAt: text("last_seen_at").notNull(),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
});

export const priceHistory = sqliteTable("price_history", {
	id: text("id").primaryKey(),
	sourceOfferId: text("source_offer_id")
		.notNull()
		.references(() => sourceOffers.id),
	price: integer("price").notNull(),
	currency: text("currency").notNull().default("BRL"),
	inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
	capturedAt: text("captured_at").notNull(),
});
