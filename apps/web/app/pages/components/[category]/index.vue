<script setup lang="ts">
import type { ComponentsResponse } from "@spectracker/contracts";
import { Box, Cpu, Layers3, Zap } from "lucide-vue-next";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

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

function formatPrice(priceInCents: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format((priceInCents ?? 0) / 100);
}

function topSpecs(item: (ComponentsResponse["items"])[number]): Array<{ label: string; value: string }> {
	const specs = item.specs ?? {};
	const orderedKeys = [
		"model_name",
		"base_clock_ghz",
		"turbo_clock_ghz",
		"cores",
		"threads",
		"cache",
		"socket",
		"sku",
	] as const;
	const labels: Record<string, string> = {
		model_name: "Modelo",
		base_clock_ghz: "Clock Base",
		turbo_clock_ghz: "Turbo",
		cores: "Cores",
		threads: "Threads",
		cache: "Cache",
		socket: "Socket",
		sku: "SKU",
	};

	const result: Array<{ label: string; value: string }> = [];
	for (const key of orderedKeys) {
		const value = specs[key];
		if (!value) {
			continue;
		}
		if (key === "base_clock_ghz" || key === "turbo_clock_ghz") {
			result.push({ label: labels[key], value: `${value} GHz` });
			continue;
		}
		result.push({ label: labels[key], value });
	}

	if (!result.length && item.socket) {
		result.push({ label: "Socket", value: item.socket });
	}
	if (!result.length && item.model) {
		result.push({ label: "Modelo", value: item.model });
	}
	if (result.length < 4) {
		result.push({ label: "Estoque", value: item.inStock === false ? "Indisponível" : "Disponível" });
	}

	return result;
}

function specIcon(label: string) {
	const normalized = label.toLowerCase();
	if (normalized.includes("socket")) {
		return Cpu;
	}
	if (normalized.includes("núcleo") || normalized.includes("core") || normalized.includes("thread")) {
		return Layers3;
	}
	if (normalized.includes("frequ") || normalized.includes("clock") || normalized.includes("ghz")) {
		return Zap;
	}
	return Box;
}
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
			<Card
				v-for="item in filteredItems"
				:key="item.id"
				class="overflow-hidden border-border/70 py-2!"
			>
					<CardContent class="p-2">
						<div class="flex flex-col gap-5 md:flex-row md:items-center">
							<div
								class="relative  w-full shrink-0 overflow-hidden rounded-lg border bg-muted/30 size:24 md:size-48"
							>
								<img
									v-if="item.imageUrl"
									:src="item.imageUrl"
									:alt="item.name"
									class="size-full object-contain"
									loading="lazy"
								/>
								<div
									v-else
									class="flex size-full items-center justify-center text-muted-foreground"
								>
									<Cpu class="size-6" />
								</div>
								<Badge
									v-if="item.socket"
									variant="secondary"
									class="absolute left-2 top-2 border bg-background/90 text-[10px] font-semibold"
								>
									{{ item.socket }}
								</Badge>
							</div>
							<div class="min-w-0 flex-1">
								<div class="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-start">
									<div>
										<p class="mb-1 text-xs font-semibold uppercase tracking-wide text-primary/90">
											{{ item.brand ?? "Component" }}
										</p>
										<h2 class="line-clamp-2 text-lg font-bold leading-snug">
											{{ item.name }}
										</h2>
										
									</div>
									<Badge variant="outline" class="hidden md:inline-flex">
										{{ item.store ? item.store.toUpperCase() : "CATALOG" }}
									</Badge>
								</div>

								<div class="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3 md:grid-cols-4">
									<div
										v-for="spec in topSpecs(item)"
										:key="`${item.id}-${spec.label}`"
										class="flex min-w-0 flex-col"
									>
										<span
											class="mb-0.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
										>
											<component :is="specIcon(spec.label)" class="size-3" />
											{{ spec.label }}
										</span>
										<span class="truncate text-sm font-medium">{{ spec.value }}</span>
									</div>
								</div>
							</div>

							<div
								class="flex w-full shrink-0 flex-row items-center justify-between gap-3 border-t pt-4 md:w-48 md:flex-col md:items-center md:border-l md:border-t-0 md:pl-5 md:pt-0"
							>
								<div class="text-left md:text-right">
									<p class="text-2xl font-bold text-emerald-500">{{ formatPrice(item.price) }}</p>
									<p class="text-xs text-muted-foreground">
										{{ item.inStock === false ? "Indisponível" : "Disponível em estoque" }}
									</p>
									<a
										v-if="item.url"
										:href="item.url"
										target="_blank"
										rel="noreferrer noopener"
										class="mt-2 inline-block"
									>
										<Button size="sm" variant="outline" class="bg-emerald-600!">Link do produto</Button>
									</a>
								</div>
							</div>
						</div>
					</CardContent>
			</Card>
		</div>
	</div>
</template>
