<script setup lang="ts">
import type { ComponentsResponse } from "@spectracker/contracts";

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

function formatPrice(priceInCents: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format((priceInCents ?? 0) / 100);
}
</script>

<template>
	<div class="space-y-6">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Category: {{ category.toUpperCase() }}</h1>
			<p class="text-sm text-muted-foreground">{{ data?.total ?? 0 }} items</p>
		</div>

		<div v-if="(data?.items?.length ?? 0) === 0" class="rounded-lg border border-dashed p-6">
			<p class="text-sm text-muted-foreground">No items found for this category.</p>
		</div>

		<div v-else class="grid gap-3">
			<NuxtLink
				v-for="item in data?.items"
				:key="item.id"
				:to="`/components/${category}/${item.id}`"
				class="rounded-lg border p-4 transition-colors hover:bg-muted/40"
			>
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="font-medium leading-snug">{{ item.name }}</p>
						<p class="mt-1 text-xs text-muted-foreground">
							{{ item.store ? item.store.toUpperCase() : "catalog" }}
							<span v-if="item.inStock === false">• out of stock</span>
						</p>
					</div>
					<p class="shrink-0 font-semibold">{{ formatPrice(item.price) }}</p>
				</div>
			</NuxtLink>
		</div>
	</div>
</template>
