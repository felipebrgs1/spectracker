import { categories, components, db } from "@spectracker/db";
import { asc, eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
	const query = getQuery(event);
	const categorySlug = typeof query.category === "string" ? query.category : undefined;

	const baseQuery = db
		.select({
			id: components.id,
			name: components.name,
			category: categories.slug,
			price: components.price,
		})
		.from(components)
		.innerJoin(categories, eq(components.categoryId, categories.id))
		.orderBy(asc(components.name));

	const rows = categorySlug
		? await baseQuery.where(eq(categories.slug, categorySlug))
		: await baseQuery;

	return {
		items: rows.map((row) => {
			return {
				id: row.id,
				name: row.name,
				category: row.category,
				price: row.price ?? 0,
			};
		}),
		total: rows.length,
	};
});
