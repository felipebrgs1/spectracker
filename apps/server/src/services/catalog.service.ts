import {
	categories,
	components,
	componentSpecs,
	sourceOffers,
	type AppDatabase,
} from "@spectracker/db";
import { asc, count, eq, inArray, or, sql } from "drizzle-orm";
// import type { DrizzleD1Database } from "drizzle-orm/d1";
import { detectSocketFromText, parseCpuSpecsFromTitle, parseJsonObject } from "../utils/helpers";

export class CatalogService {
	constructor(private db: AppDatabase) {}

	async getCategories() {
		const categoryRows = await this.db
			.select({
				id: categories.id,
				name: categories.name,
				slug: categories.slug,
			})
			.from(categories)
			.orderBy(asc(categories.sortOrder));

		const componentCounts = await this.db
			.select({
				categoryId: components.categoryId,
				total: count(components.id),
			})
			.from(components)
			.groupBy(components.categoryId);

		const offerCounts = await this.db
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

		return categoryRows.map((row) => {
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
	}

	async getComponents(categorySlug?: string) {
		const componentQuery = this.db
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

		const offerQuery = this.db
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
				? await this.db
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

		return [...normalizedComponents, ...normalizedOffers];
	}
}
