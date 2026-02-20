<script setup lang="ts">
import type { ComponentItem } from "@spectracker/contracts";
import { Box, Cpu, Layers3, Zap } from "lucide-vue-next";

const props = defineProps<{
	item: ComponentItem;
}>();

function topSpecs(item: ComponentItem): Array<{ label: string; value: string }> {
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
		result.push({
			label: "Estoque",
			value: item.inStock === false ? "Indisponível" : "Disponível",
		});
	}

	return result;
}

function specIcon(label: string) {
	const normalized = label.toLowerCase();
	if (normalized.includes("socket")) {
		return Cpu;
	}
	if (
		normalized.includes("núcleo") ||
		normalized.includes("core") ||
		normalized.includes("thread")
	) {
		return Layers3;
	}
	if (normalized.includes("frequ") || normalized.includes("clock") || normalized.includes("ghz")) {
		return Zap;
	}
	return Box;
}
</script>

<template>
	<div class="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3 md:grid-cols-4">
		<div
			v-for="spec in topSpecs(props.item)"
			:key="`${props.item.id}-${spec.label}`"
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
</template>
