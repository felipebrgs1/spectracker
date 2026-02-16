<script setup lang="ts">
import type { ComponentsResponse } from "@spectracker/contracts";

const route = useRoute();
const category = String(route.params.category || "");
const id = String(route.params.id || "");

const { data } = await useFetch<ComponentsResponse>("/api/components", {
	query: {
		category,
	},
});

const item = computed(() => {
	return data.value?.items.find((entry) => entry.id === id);
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
		<div v-if="!item" class="rounded-lg border border-dashed p-6">
			<h1 class="text-xl font-semibold">Item not found</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				This item is not available for category {{ category }}.
			</p>
		</div>

		<div v-else class="space-y-3">
			<h1 class="text-3xl font-bold tracking-tight">{{ item.name }}</h1>
			<p class="text-muted-foreground">Category: {{ category.toUpperCase() }}</p>
			<p class="text-lg font-semibold">{{ formatPrice(item.price) }}</p>
			<p class="text-sm text-muted-foreground">
				Source: {{ item.store ? item.store.toUpperCase() : "catalog" }}
			</p>
			<a
				v-if="item.url"
				:href="item.url"
				target="_blank"
				rel="noreferrer noopener"
				class="inline-block text-sm text-primary underline-offset-4 hover:underline"
			>
				Open offer page
			</a>
		</div>
	</div>
</template>
