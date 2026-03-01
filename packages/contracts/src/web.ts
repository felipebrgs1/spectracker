import { z } from "zod";

export const categoryItemSchema = z.object({
	name: z.string(),
	slug: z.string(),
	componentCount: z.number().int().nonnegative(),
});

export const categoriesResponseSchema = z.array(categoryItemSchema);

export const componentItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	category: z.string(),
	price: z.number().int().nonnegative(),
	store: z.string().nullable().optional(),
	url: z.string().nullable().optional(),
	inStock: z.boolean().optional(),
	imageUrl: z.string().nullable().optional(),
	brand: z.string().nullable().optional(),
	model: z.string().nullable().optional(),
	socket: z.string().nullable().optional(),
	specs: z.record(z.string(), z.string()).optional(),
});

export const componentsResponseSchema = z.object({
	items: z.array(componentItemSchema),
	total: z.number().int().nonnegative(),
});

export type CategoryItem = z.infer<typeof categoryItemSchema>;
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;
export type ComponentItem = z.infer<typeof componentItemSchema>;
export type ComponentsResponse = z.infer<typeof componentsResponseSchema>;

export const gpuCatalogItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string(),
	imageUrl: z.string().nullable(),
	specs: z.record(z.string(), z.string()),
	updatedAt: z.string(),
});

export const gpuCatalogResponseSchema = z.object({
	items: z.array(gpuCatalogItemSchema),
	total: z.number().int().nonnegative(),
});

export type GpuCatalogItem = z.infer<typeof gpuCatalogItemSchema>;
export type GpuCatalogResponse = z.infer<typeof gpuCatalogResponseSchema>;

export const dashboardStatsSchema = z.object({
	components: z.number().int().nonnegative(),
	builds: z.number().int().nonnegative(),
	categories: z.number().int().nonnegative(),
});

export const dashboardOverviewSchema = z.object({
	stats: dashboardStatsSchema,
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
