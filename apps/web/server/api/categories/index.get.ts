import { categoriesResponseSchema } from "@spectracker/contracts";
import { categories, components, db, sourceOffers } from "@spectracker/db";
import { asc, sql } from "drizzle-orm";

export default defineEventHandler(async () => {
	const rows = await db
		.select({
			name: categories.name,
			slug: categories.slug,
			componentCount: sql<number>`(
				(
					select count(*)
					from ${components}
					where ${components.categoryId} = ${categories.id}
				) + (
					select count(*)
					from ${sourceOffers}
					where ${sourceOffers.categoryId} = ${categories.id}
				)
			)`,
		})
		.from(categories)
		.orderBy(asc(categories.sortOrder));

	const response = rows.map((row) => {
		return {
			name: row.name,
			slug: row.slug,
			componentCount: row.componentCount,
		};
	});

	return categoriesResponseSchema.parse(response);
});
