<script setup lang="ts">
import type { ComponentsResponse } from "@spectracker/contracts";
import { Button } from "~/components/ui/button";

const route = useRoute();
const category = String(route.params.category || "");

useHead({
	title: `Components: ${category.toUpperCase()}`,
});

const { data } = await useFetch<ComponentsResponse>("/api/components", {
	query: {
		category,
	},
});

const selectedBrand = ref("all");

const availableBrands = computed(() => {
	const brands = new Set<string>();
	for (const item of data.value?.items ?? []) {
		if (item.brand) {
			brands.add(item.brand);
		}
	}
	return ["all", ...Array.from(brands).sort((a, b) => a.localeCompare(b))];
});

const filteredItems = computed(() => {
	const items = data.value?.items ?? [];
	if (selectedBrand.value === "all") {
		return items;
	}
	return items.filter((item) => item.brand === selectedBrand.value);
});
</script>

<template>
	<div class="space-y-6">
		<div class="border-b pb-4">
			<div class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
				<div>
					<h1 class="text-3xl font-bold tracking-tight">{{ category.toUpperCase() }}</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Categoria: {{ category.toUpperCase() }} • {{ filteredItems.length }} itens listados
					</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<Button
						v-for="brand in availableBrands"
						:key="brand"
						size="sm"
						:variant="selectedBrand === brand ? 'default' : 'outline'"
						class="h-8 text-xs"
						@click="selectedBrand = brand"
					>
						{{ brand === "all" ? "Todos" : brand }}
					</Button>
				</div>
			</div>
		</div>

		<div v-if="filteredItems.length === 0" class="rounded-lg border border-dashed p-6">
			<p class="text-sm text-muted-foreground">No items found for this category.</p>
		</div>

		<div v-else class="space-y-2">
			<CatalogComponentListItem
				v-for="item in filteredItems"
				:key="item.id"
				:item="item"
			/>
		</div>
	</div>
</template>
