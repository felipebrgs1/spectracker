<script setup lang="ts">
import {
	Cpu,
	Gauge,
	MemoryStick,
	Database,
	Cable,
	Zap,
	CalendarDays,
	ExternalLink,
} from "lucide-vue-next";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

type GpuDetail = {
	id: string;
	name: string;
	url: string;
	imageUrl: string | null;
	specs: Record<string, string>;
	updatedAt: string;
};

const route = useRoute();
const id = computed(() => String(route.params.id || ""));

const { data } = await useFetch<GpuDetail>(`/api/gpu-specs/${id.value}`);

const rows = computed(() => {
	const specs = data.value?.specs ?? {};
	return [
		{ label: "Arquitetura", key: "architecture", icon: Cpu },
		{ label: "Interface", key: "bus_interface", icon: Cable },
		{ label: "Clock Base", key: "base_clock", icon: Gauge },
		{ label: "Clock Boost", key: "boost_clock", icon: Gauge },
		{ label: "Memoria", key: "memory_size", icon: MemoryStick },
		{ label: "Tipo Memoria", key: "memory_type", icon: MemoryStick },
		{ label: "Clock Memoria", key: "memory_clock", icon: MemoryStick },
		{ label: "Bus Memoria", key: "memory_bus", icon: Database },
		{ label: "Bandwidth", key: "bandwidth", icon: Database },
		{ label: "TGP/TDP", key: "tgp", icon: Zap },
		{ label: "Lancamento", key: "release_date", icon: CalendarDays },
	].map((row) => ({
		...row,
		value: specs[row.key] || "-",
	}));
});

const availableRows = computed(() => rows.value.filter((row) => row.value !== "-"));
const missingRows = computed(() => rows.value.filter((row) => row.value === "-"));
</script>

<template>
	<div class="space-y-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">{{ data?.name }}</h1>
				<p class="text-sm text-muted-foreground">Specs principais do chip</p>
			</div>
			<div class="flex items-center gap-2">
				<Button as-child variant="outline" size="sm">
					<a :href="data?.url" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1">
						Fonte <ExternalLink class="size-3.5" />
					</a>
				</Button>
				<Button as-child variant="outline" size="sm">
					<NuxtLink to="/gpu-specs">Voltar</NuxtLink>
				</Button>
			</div>
		</div>

		<div class="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
			<Card>
				<CardContent class="p-3">
					<div class="aspect-[4/3] overflow-hidden rounded-md border bg-muted/30">
						<img
							v-if="data?.imageUrl"
							:src="data.imageUrl"
							:alt="data?.name"
							class="size-full object-cover"
						/>
						<div v-else class="flex size-full items-center justify-center">
							<Cpu class="size-8 text-muted-foreground" />
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Specs</CardTitle>
				</CardHeader>
				<CardContent>
					<div v-if="availableRows.length === 0" class="text-sm text-muted-foreground">
						Este modelo não possui specs detalhadas suficientes no payload atual.
					</div>
					<div v-else class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
						<div
							v-for="row in availableRows"
							:key="row.key"
							class="rounded-md border p-3"
						>
							<p class="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
								<component :is="row.icon" class="size-3.5" />
								{{ row.label }}
							</p>
							<p class="mt-1 text-sm font-medium break-words">{{ row.value }}</p>
						</div>
					</div>
					<p v-if="missingRows.length > 0" class="mt-3 text-xs text-muted-foreground">
						Alguns campos não foram informados pela fonte para este modelo.
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</template>
