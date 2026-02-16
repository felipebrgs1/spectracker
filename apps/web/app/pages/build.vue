<script setup lang="ts">
import { Wrench, Plus } from "lucide-vue-next";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

useHead({
	title: "Builder",
});
</script>

<template>
	<div class="space-y-6">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">PC Builder</h1>
			<p class="text-muted-foreground">Select components and check compatibility in real-time.</p>
		</div>

		<Card class="border-dashed">
			<CardContent class="flex flex-col items-center justify-center py-16">
				<div class="flex size-14 items-center justify-center rounded-full bg-muted">
					<Wrench class="size-7 text-muted-foreground" />
				</div>
				<h3 class="mt-4 font-medium">Builder Coming Soon</h3>
				<p class="mt-1 max-w-sm text-center text-sm text-muted-foreground">
					The PC builder will be available once the component database is populated.
				</p>
				<Button class="mt-6 gap-2" variant="outline" disabled>
					<Plus class="size-4" />
					Start Building
				</Button>
			</CardContent>
		</Card>
	</div>
</template>
