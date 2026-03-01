import { categoriesResponseSchema, componentsResponseSchema } from "@spectracker/contracts";
import type { CatalogService } from "../services/catalog.service";

export class CatalogController {
	constructor(private catalogService: CatalogService) {}

	async getCategories() {
		const categories = await this.catalogService.getCategories();
		return categoriesResponseSchema.parse(categories);
	}

	async getComponents(categorySlug?: string) {
		const components = await this.catalogService.getComponents(categorySlug);
		return componentsResponseSchema.parse({
			items: components,
			total: components.length,
		});
	}
}
