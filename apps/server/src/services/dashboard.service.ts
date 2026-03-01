import { builds, categories, components, sourceOffers, type AppDatabase } from "@spectracker/db";
import { count } from "drizzle-orm";

export class DashboardService {
	constructor(private db: AppDatabase) {}

	async getOverview() {
		const [componentTotal] = await this.db.select({ value: count(components.id) }).from(components);
		const [offerTotal] = await this.db.select({ value: count(sourceOffers.id) }).from(sourceOffers);
		const [buildTotal] = await this.db.select({ value: count(builds.id) }).from(builds);
		const [categoryTotal] = await this.db.select({ value: count(categories.id) }).from(categories);

		return {
			stats: {
				components: Number(componentTotal?.value ?? 0) + Number(offerTotal?.value ?? 0),
				builds: Number(buildTotal?.value ?? 0),
				categories: Number(categoryTotal?.value ?? 0),
			},
		};
	}
}
