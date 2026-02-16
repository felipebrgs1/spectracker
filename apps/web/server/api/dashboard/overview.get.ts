import { builds, categories, components, db, sourceOffers } from "@spectracker/db";
import { count } from "drizzle-orm";

export default defineEventHandler(async () => {
	const [componentTotal] = await db.select({ value: count(components.id) }).from(components);
	const [offerTotal] = await db.select({ value: count(sourceOffers.id) }).from(sourceOffers);
	const [buildTotal] = await db.select({ value: count(builds.id) }).from(builds);
	const [categoryTotal] = await db.select({ value: count(categories.id) }).from(categories);

	return {
		stats: {
			components: Number(componentTotal?.value ?? 0) + Number(offerTotal?.value ?? 0),
			builds: Number(buildTotal?.value ?? 0),
			categories: Number(categoryTotal?.value ?? 0),
		},
	};
});
