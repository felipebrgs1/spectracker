import { categories, components, db } from "@spectracker/db";
import { asc, count, eq } from "drizzle-orm";

export default defineEventHandler(async () => {
	const rows = await db
		.select({
			name: categories.name,
			slug: categories.slug,
			componentCount: count(components.id),
		})
		.from(categories)
		.leftJoin(components, eq(components.categoryId, categories.id))
		.groupBy(categories.id)
		.orderBy(asc(categories.sortOrder));

	return rows.map((row) => {
		return {
			name: row.name,
			slug: row.slug,
			componentCount: Number(row.componentCount),
		};
	});
});
