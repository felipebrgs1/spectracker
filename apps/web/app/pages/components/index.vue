<script setup lang="ts">
import { Cpu, Search } from "lucide-vue-next";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

useHead({
	title: "Components",
});
</script>

<template>
	<div class="space-y-6">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Components</h1>
			<p class="text-muted-foreground">Browse all PC components in the database.</p>
		</div>

		<Card class="border-dashed">
			<CardContent class="flex flex-col items-center justify-center py-16">
				<div class="flex size-14 items-center justify-center rounded-full bg-muted">
					<Cpu class="size-7 text-muted-foreground" />
				</div>
				<h3 class="mt-4 font-medium">No Components Yet</h3>
				<p class="mt-1 max-w-sm text-center text-sm text-muted-foreground">
					Components will appear here once the database is seeded with hardware data.
				</p>
				<Button class="mt-6 gap-2" variant="outline" disabled>
					<Search class="size-4" />
					Browse Components
				</Button>
			</CardContent>
		</Card>
	</div>
</template>
