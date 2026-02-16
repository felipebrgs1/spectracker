import { componentsResponseSchema } from "@spectracker/contracts";
import { categories, components, db, sourceOffers } from "@spectracker/db";
import { asc, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const categorySlug = typeof query.category === "string" ? query.category : undefined;

	const componentQuery = db
		.select({
			id: components.id,
			name: components.name,
			category: categories.slug,
			price: components.price,
			store: null as string | null,
			url: null as string | null,
			inStock: true,
			imageUrl: components.imageUrl,
		})
		.from(components)
		.innerJoin(categories, eq(components.categoryId, categories.id))
		.orderBy(asc(components.name));

	const offerQuery = db
		.select({
			id: sourceOffers.id,
			name: sourceOffers.title,
			category: categories.slug,
			price: sourceOffers.price,
			store: sourceOffers.store,
			url: sourceOffers.url,
			inStock: sourceOffers.inStock,
			imageUrl: sourceOffers.imageUrl,
		})
		.from(sourceOffers)
		.innerJoin(categories, eq(sourceOffers.categoryId, categories.id))
		.orderBy(asc(sourceOffers.title));

	const componentRows = categorySlug
		? await componentQuery.where(eq(categories.slug, categorySlug))
		: await componentQuery;
	const offerRows = categorySlug
		? await offerQuery.where(eq(categories.slug, categorySlug))
		: await offerQuery;
	const rows = [...componentRows, ...offerRows];

	const response = {
		items: rows.map((row) => {
			return {
				id: row.id,
				name: row.name,
				category: row.category,
				price: row.price ?? 0,
				store: row.store,
				url: row.url,
				inStock: row.inStock,
				imageUrl: row.imageUrl,
			};
		}),
		total: rows.length,
	};

	return componentsResponseSchema.parse(response);
});
