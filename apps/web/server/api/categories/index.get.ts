import { categoriesResponseSchema } from "@spectracker/contracts";
import { categories, components, db, sourceOffers } from "@spectracker/db";
import { asc, count } from "drizzle-orm";

export default defineEventHandler(async () => {
	const categoryRows = await db
		.select({
			id: categories.id,
			name: categories.name,
			slug: categories.slug,
		})
		.from(categories)
		.orderBy(asc(categories.sortOrder));

	const componentCounts = await db
		.select({
			categoryId: components.categoryId,
			total: count(components.id),
		})
		.from(components)
		.groupBy(components.categoryId);

	const offerCounts = await db
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

	const response = categoryRows.map((row) => {
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

	return categoriesResponseSchema.parse(response);
});
