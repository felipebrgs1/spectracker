<script setup lang="ts">
import type { ComponentItem } from "@spectracker/contracts";
import { Cpu } from "lucide-vue-next";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

const props = defineProps<{
	item: ComponentItem;
}>();

function formatPrice(priceInCents: number): string {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format((priceInCents ?? 0) / 100);
}
</script>

<template>
	<Card class="overflow-hidden border-border/70">
		<CardContent class="p-2">
			<div class="flex flex-col gap-5 md:flex-row md:items-center">
				<div
					class="relative size-24 w-full shrink-0 overflow-hidden rounded-lg border bg-muted/30 md:size-48"
				>
					<img
						v-if="props.item.imageUrl"
						:src="props.item.imageUrl"
						:alt="props.item.name"
						class="size-full object-contain"
						loading="lazy"
					/>
					<div v-else class="flex size-full items-center justify-center text-muted-foreground">
						<Cpu class="size-6" />
					</div>
					<Badge
						v-if="props.item.socket"
						variant="secondary"
						class="absolute left-2 top-2 border bg-background/90 text-[10px] font-semibold"
					>
						{{ props.item.socket }}
					</Badge>
				</div>

				<div class="min-w-0 flex-1">
					<div class="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-start">
						<div>
							<p class="mb-1 text-xs font-semibold uppercase tracking-wide text-primary/90">
								{{ props.item.brand ?? "Component" }}
							</p>
							<h2 class="line-clamp-2 text-lg font-bold leading-snug">
								{{ props.item.name }}
							</h2>
						</div>
						<Badge variant="outline" class="hidden md:inline-flex">
							{{ props.item.store ? props.item.store.toUpperCase() : "CATALOG" }}
						</Badge>
					</div>

					<CatalogComponentSpecsGrid :item="props.item" />
				</div>

				<div
					class="flex w-full shrink-0 flex-row items-center justify-between gap-3 border-t pt-4 md:w-48 md:flex-col md:items-center md:border-l md:border-t-0 md:pl-5 md:pt-0"
				>
					<div class="text-left md:text-right">
						<p class="text-2xl font-bold text-emerald-500">{{ formatPrice(props.item.price) }}</p>
						<p class="text-xs text-muted-foreground">
							{{ props.item.inStock === false ? "Indisponível" : "Disponível em estoque" }}
						</p>
						<a
							v-if="props.item.url"
							:href="props.item.url"
							target="_blank"
							rel="noreferrer noopener"
							class="mt-2 inline-block"
						>
							<Button size="sm" class="bg-emerald-600! hover:bg-emerald-700!"
								>Link do produto</Button
							>
						</a>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
</template>
