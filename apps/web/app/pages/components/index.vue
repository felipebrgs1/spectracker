<script setup lang="ts">
import type { ComponentsResponse } from "@spectracker/contracts";
import { Cpu } from "lucide-vue-next";
import { Card, CardContent } from "~/components/ui/card";

useHead({
	title: "Components",
});

const { data } = await useFetch<ComponentsResponse>("/api/components");

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
			<h1 class="text-2xl font-bold tracking-tight">Components</h1>
			<p class="text-muted-foreground">Browse all PC components in the database.</p>
		</div>

		<Card v-if="(data?.items?.length ?? 0) === 0" class="border-dashed">
			<CardContent class="flex flex-col items-center justify-center py-16">
				<div class="flex size-14 items-center justify-center rounded-full bg-muted">
					<Cpu class="size-7 text-muted-foreground" />
				</div>
				<h3 class="mt-4 font-medium">No Components Yet</h3>
				<p class="mt-1 max-w-sm text-center text-sm text-muted-foreground">
					Found {{ data?.total ?? 0 }} components. This list will populate once the database is
					seeded with hardware data.
				</p>
			</CardContent>
		</Card>

		<div v-else class="grid gap-3">
			<NuxtLink
				v-for="item in data?.items"
				:key="item.id"
				:to="`/components/${item.category}/${item.id}`"
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
