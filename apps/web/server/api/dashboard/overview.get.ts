import { builds, categories, components, db } from "@spectracker/db";
import { count } from "drizzle-orm";

export default defineEventHandler(async () => {
	const [componentTotal] = await db.select({ value: count(components.id) }).from(components);
	const [buildTotal] = await db.select({ value: count(builds.id) }).from(builds);
	const [categoryTotal] = await db.select({ value: count(categories.id) }).from(categories);

	return {
		stats: {
			components: Number(componentTotal?.value ?? 0),
			builds: Number(buildTotal?.value ?? 0),
			categories: Number(categoryTotal?.value ?? 0),
		},
	};
});
