<script setup lang="ts">
import {
	Cpu,
	HardDrive,
	Monitor,
	MemoryStick,
	CircuitBoard,
	Zap,
	Box,
	Fan,
	Plus,
	ArrowRight,
	TrendingUp,
} from "lucide-vue-next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";

useHead({
	title: "Dashboard",
});

const categories = [
	{ name: "CPU", slug: "cpu", icon: Cpu, count: 0, color: "text-blue-500" },
	{ name: "GPU", slug: "gpu", icon: Monitor, count: 0, color: "text-green-500" },
	{
		name: "Motherboard",
		slug: "motherboard",
		icon: CircuitBoard,
		count: 0,
		color: "text-purple-500",
	},
	{ name: "RAM", slug: "ram", icon: MemoryStick, count: 0, color: "text-amber-500" },
	{ name: "Storage", slug: "storage", icon: HardDrive, count: 0, color: "text-rose-500" },
	{ name: "PSU", slug: "psu", icon: Zap, count: 0, color: "text-yellow-500" },
	{ name: "Case", slug: "case", icon: Box, count: 0, color: "text-cyan-500" },
	{ name: "Cooler", slug: "cooler", icon: Fan, count: 0, color: "text-teal-500" },
];

const stats = [
	{ label: "Components", value: "0", description: "in database", icon: Cpu },
	{ label: "Builds", value: "0", description: "created", icon: Box },
	{ label: "Categories", value: "8", description: "available", icon: CircuitBoard },
];
</script>

<template>
	<div class="space-y-8">
		<!-- Hero section -->
		<div
			class="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8 md:p-12"
		>
			<div class="absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
			<div class="absolute -bottom-20 -left-20 size-64 rounded-full bg-primary/5 blur-3xl" />
			<div class="relative">
				<Badge variant="secondary" class="mb-4">
					<span class="mr-1 inline-block size-2 animate-pulse rounded-full bg-primary" />
					Early Development
				</Badge>
				<h1 class="text-3xl font-bold tracking-tight md:text-4xl">Build Your Perfect PC</h1>
				<p class="mt-2 max-w-lg text-muted-foreground">
					Choose components, check compatibility in real-time, and create your ideal build with
					confidence.
				</p>
				<div class="mt-6 flex flex-wrap gap-3">
					<Button size="lg" class="gap-2">
						<Plus class="size-4" />
						New Build
					</Button>
					<Button variant="outline" size="lg" class="gap-2">
						Browse Components
						<ArrowRight class="size-4" />
					</Button>
				</div>
			</div>
		</div>

		<!-- Stats -->
		<div class="grid gap-4 sm:grid-cols-3">
			<Card v-for="stat in stats" :key="stat.label" class="transition-shadow hover:shadow-md">
				<CardHeader class="flex flex-row items-center justify-between pb-2">
					<CardDescription class="text-sm font-medium">{{ stat.label }}</CardDescription>
					<component :is="stat.icon" class="size-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div class="text-2xl font-bold font-mono">{{ stat.value }}</div>
					<p class="mt-1 text-xs text-muted-foreground">{{ stat.description }}</p>
				</CardContent>
			</Card>
		</div>

		<!-- Categories grid -->
		<div>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold tracking-tight">Component Categories</h2>
					<p class="text-sm text-muted-foreground">Browse components by type</p>
				</div>
			</div>
			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Card
					v-for="category in categories"
					:key="category.slug"
					class="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
				>
					<CardContent class="flex items-center gap-4 p-4">
						<div
							class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10"
						>
							<component
								:is="category.icon"
								class="size-5 transition-colors"
								:class="category.color"
							/>
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium">{{ category.name }}</p>
							<p class="text-xs text-muted-foreground">{{ category.count }} items</p>
						</div>
						<ArrowRight
							class="size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
						/>
					</CardContent>
				</Card>
			</div>
		</div>

		<!-- Recent Builds (empty state) -->
		<div>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold tracking-tight">Recent Builds</h2>
					<p class="text-sm text-muted-foreground">Your latest PC configurations</p>
				</div>
			</div>
			<Card class="border-dashed">
				<CardContent class="flex flex-col items-center justify-center py-12">
					<div class="flex size-12 items-center justify-center rounded-full bg-muted">
						<Box class="size-6 text-muted-foreground" />
					</div>
					<h3 class="mt-4 text-sm font-medium">No builds yet</h3>
					<p class="mt-1 text-center text-sm text-muted-foreground">
						Start building your first PC configuration
					</p>
					<Button class="mt-4 gap-2" size="sm">
						<Plus class="size-4" />
						Create your first build
					</Button>
				</CardContent>
			</Card>
		</div>
	</div>
</template>
