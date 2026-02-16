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
});

export const componentsResponseSchema = z.object({
	items: z.array(componentItemSchema),
	total: z.number().int().nonnegative(),
});

export type CategoryItem = z.infer<typeof categoryItemSchema>;
export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;
export type ComponentItem = z.infer<typeof componentItemSchema>;
export type ComponentsResponse = z.infer<typeof componentsResponseSchema>;
