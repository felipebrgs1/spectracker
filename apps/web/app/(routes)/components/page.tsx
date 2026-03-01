"use client";

import { useQuery } from "@tanstack/react-query";
import { Cpu } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { type ComponentsResponse } from "@spectracker/contracts";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ComponentsPage() {
	const { data, isLoading, error } = useQuery<ComponentsResponse>({
		queryKey: ["components"],
		queryFn: () => api("/catalog/components"),
	});

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Components</h1>
					<p className="text-muted-foreground">Browse all PC components in the database.</p>
				</div>
				<div className="grid gap-3">
					{[...Array(5)].map((_, i) => (
						<Skeleton key={i} className="h-20 w-full rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="p-8 text-center">
				<p className="text-destructive">Failed to load components. Please try again later.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Components</h1>
				<p className="text-muted-foreground">Browse all PC components in the database.</p>
			</div>

			{data.items.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-16">
						<div className="flex size-14 items-center justify-center rounded-full bg-muted">
							<Cpu className="size-7 text-muted-foreground" />
						</div>
						<h3 className="mt-4 font-medium">No Components Yet</h3>
						<p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
							Found {data.total} components. This list will populate once the database is seeded
							with hardware data.
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-3">
					{data.items.map((item) => (
						<Link
							key={item.id}
							href={`/components/${item.category}/${item.id}`}
							className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
						>
							<div className="flex items-start justify-between gap-4">
								<div>
									<p className="font-medium leading-snug">{item.name}</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{item.store ? item.store.toUpperCase() : "catalog"}
										{item.inStock === false && " • out of stock"}
									</p>
								</div>
								<p className="shrink-0 font-semibold">{formatPrice(item.price)}</p>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
