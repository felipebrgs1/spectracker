<script setup lang="ts">
import { Search, Cpu, Gauge, MemoryStick, CalendarDays } from "lucide-vue-next";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

type GpuCatalogItem = {
	id: string;
	name: string;
	url: string;
	imageUrl: string | null;
	specs: Record<string, string>;
	updatedAt: string;
};

type GpuCatalogResponse = {
	items: GpuCatalogItem[];
	total: number;
};

useHead({
	title: "GPU Specs",
});

const search = ref("");

const query = computed(() => ({
	search: search.value || undefined,
	limit: 200,
}));

const { data, pending, refresh } = await useFetch<GpuCatalogResponse>("/api/gpu-specs", {
	query,
});

function spec(item: GpuCatalogItem, key: string): string {
	return item.specs[key] || "-";
}

function hasSpec(item: GpuCatalogItem, key: string): boolean {
	return Boolean(item.specs[key] && item.specs[key] !== "-");
}
</script>

<template>
	<div class="space-y-6">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">GPU Specs</h1>
				<p class="text-sm text-muted-foreground">
					Catálogo visual das GPUs, focado nas especificações principais do chip.
				</p>
			</div>
			<Button variant="outline" @click="refresh()">Atualizar</Button>
		</div>

		<Card>
			<CardContent class="p-4">
				<label class="relative block">
					<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						v-model="search"
						type="text"
						placeholder="Buscar GPU (ex.: 4070, 7900, A770)"
						class="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
					/>
				</label>
			</CardContent>
		</Card>

		<p class="text-sm text-muted-foreground">
			{{ pending ? "Carregando..." : `${data?.total ?? 0} GPUs encontradas` }}
		</p>

		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			<NuxtLink
				v-for="item in data?.items"
				:key="item.id"
				:to="`/gpu-specs/${item.id}`"
				class="group rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
			>
				<div class="flex gap-3">
					<div class="size-24 shrink-0 overflow-hidden rounded-md border bg-muted/30">
						<img
							v-if="item.imageUrl"
							:src="item.imageUrl"
							:alt="item.name"
							class="size-full object-cover"
							loading="lazy"
						/>
						<div v-else class="flex size-full items-center justify-center">
							<Cpu class="size-6 text-muted-foreground" />
						</div>
					</div>
					<div class="min-w-0 flex-1">
						<p class="line-clamp-2 font-semibold leading-snug">{{ item.name }}</p>
						<p class="mt-1 text-xs text-muted-foreground">{{ spec(item, "architecture") }}</p>
					</div>
				</div>

				<div class="mt-3 grid grid-cols-2 gap-2 text-xs">
					<div v-if="hasSpec(item, 'boost_clock')" class="rounded-md border p-2">
						<p class="flex items-center gap-1 text-muted-foreground"><Gauge class="size-3.5" /> Boost</p>
						<p class="mt-0.5 font-medium">{{ spec(item, "boost_clock") }}</p>
					</div>
					<div v-if="hasSpec(item, 'memory_size')" class="rounded-md border p-2">
						<p class="flex items-center gap-1 text-muted-foreground">
							<MemoryStick class="size-3.5" /> Memoria
						</p>
						<p class="mt-0.5 font-medium">{{ spec(item, "memory_size") }}</p>
					</div>
					<div v-if="hasSpec(item, 'memory_bus')" class="rounded-md border p-2">
						<p class="flex items-center gap-1 text-muted-foreground"><Cpu class="size-3.5" /> Bus</p>
						<p class="mt-0.5 font-medium">{{ spec(item, "memory_bus") }}</p>
					</div>
					<div v-if="hasSpec(item, 'release_date')" class="rounded-md border p-2">
						<p class="flex items-center gap-1 text-muted-foreground">
							<CalendarDays class="size-3.5" /> Lancamento
						</p>
						<p class="mt-0.5 font-medium">{{ spec(item, "release_date") }}</p>
					</div>
				</div>
			</NuxtLink>
		</div>
	</div>
</template>
