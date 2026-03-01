import { Elysia } from "elysia";
import { getDb } from "../utils/db";
import { CatalogService } from "../services/catalog.service";
import { GpuService } from "../services/gpu.service";
import { DashboardService } from "../services/dashboard.service";
import { CatalogController } from "../controllers/catalog.controller";
import { GpuController } from "../controllers/gpu.controller";
import { DashboardController } from "../controllers/dashboard.controller";

export const setupRoutes = (dbBinding: any) => {
	const db = getDb(dbBinding);

	const catalogService = new CatalogService(db);
	const gpuService = new GpuService(db);
	const dashboardService = new DashboardService(db);

	const catalogController = new CatalogController(catalogService);
	const gpuController = new GpuController(gpuService);
	const dashboardController = new DashboardController(dashboardService);

	return new Elysia()
		.get("/", () => "OK")
		.group("/catalog", (app) =>
			app
				.get("/categories", () => catalogController.getCategories())
				.get("/components", ({ query }: { query: { category?: string } }) =>
					catalogController.getComponents(query.category),
				),
		)
		.group("/dashboard", (app) => app.get("/overview", () => dashboardController.getOverview()))
		.group("/gpu-specs", (app) =>
			app
				.get("/", ({ query }: { query: { search?: string; limit?: string } }) =>
					gpuController.getGpuSpecs(query.search, query.limit),
				)
				.get("/:id", ({ params }: { params: { id: string } }) =>
					gpuController.getGpuDetail(params.id),
				),
		);
};
