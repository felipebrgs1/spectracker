import { Search, Cpu, Gauge, MemoryStick, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";

interface GpuCatalogItem {
	id: string;
	name: string;
	url: string;
	imageUrl: string | null;
	specs: Record<string, string>;
	updatedAt: string;
}

interface GpuCatalogResponse {
	items: GpuCatalogItem[];
	total: number;
}

async function getGpuSpecs(search?: string) {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const url = new URL(`${baseUrl}/api/gpu-specs`);
	if (search) url.searchParams.set("search", search);
	url.searchParams.set("limit", "50");

	const res = await fetch(url.toString(), {
		cache: "no-store",
	});

	if (!res.ok) {
		return { items: [], total: 0 };
	}

	return await res.json();
}

function spec(item: GpuCatalogItem, key: string): string {
	return item.specs[key] || "-";
}

function hasSpec(item: GpuCatalogItem, key: string): boolean {
	return Boolean(item.specs[key] && item.specs[key] !== "-");
}

export default async function GpuSpecsPage({
	searchParams,
}: {
	searchParams: Promise<{ search?: string }>;
}) {
	const { search } = await searchParams;
	const data: GpuCatalogResponse = await getGpuSpecs(search);

	async function handleSearch(formData: FormData) {
		"use server";
		const searchForm = formData.get("search") as string;
		if (searchForm) {
			redirect(`/gpu-specs?search=${encodeURIComponent(searchForm)}`);
		} else {
			redirect("/gpu-specs");
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">GPU Specs</h1>
					<p className="text-sm text-muted-foreground">
						Catálogo visual das GPUs, focado nas especificações principais do chip.
					</p>
				</div>
				<form
					action={async () => {
						"use server";
						redirect("/gpu-specs");
					}}
				>
					<Button variant="outline" type="submit">
						Atualizar
					</Button>
				</form>
			</div>

			<Card>
				<CardContent className="p-4">
					<form action={handleSearch} className="relative block">
						<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<input
							name="search"
							defaultValue={search}
							type="text"
							placeholder="Buscar GPU (ex.: 4070, 7900, A770)"
							className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
						/>
					</form>
				</CardContent>
			</Card>

			<p className="text-sm text-muted-foreground">{data.total} GPUs encontradas</p>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{data.items.map((item) => (
					<Link
						key={item.id}
						href={`/gpu-specs/${item.id}`}
						className="group rounded-xl border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
					>
						<div className="flex gap-3">
							<div className="size-24 shrink-0 overflow-hidden rounded-md border bg-muted/30">
								{item.imageUrl ? (
									<Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
								) : (
									<div className="flex size-full items-center justify-center">
										<Cpu className="size-6 text-muted-foreground" />
									</div>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="line-clamp-2 font-semibold leading-snug">{item.name}</p>
								<p className="mt-1 text-xs text-muted-foreground">{spec(item, "architecture")}</p>
							</div>
						</div>

						<div className="mt-3 grid grid-cols-2 gap-2 text-xs">
							{hasSpec(item, "boost_clock") && (
								<div className="rounded-md border p-2">
									<p className="flex items-center gap-1 text-muted-foreground">
										<Gauge className="size-3.5" /> Boost
									</p>
									<p className="mt-0.5 font-medium">{spec(item, "boost_clock")}</p>
								</div>
							)}
							{hasSpec(item, "memory_size") && (
								<div className="rounded-md border p-2">
									<p className="flex items-center gap-1 text-muted-foreground">
										<MemoryStick className="size-3.5" /> Memoria
									</p>
									<p className="mt-0.5 font-medium">{spec(item, "memory_size")}</p>
								</div>
							)}
							{hasSpec(item, "memory_bus") && (
								<div className="rounded-md border p-2">
									<p className="flex items-center gap-1 text-muted-foreground">
										<Cpu className="size-3.5" /> Bus
									</p>
									<p className="mt-0.5 font-medium">{spec(item, "memory_bus")}</p>
								</div>
							)}
							{hasSpec(item, "release_date") && (
								<div className="rounded-md border p-2">
									<p className="flex items-center gap-1 text-muted-foreground">
										<CalendarDays className="size-3.5" /> Lancamento
									</p>
									<p className="mt-0.5 font-medium">{spec(item, "release_date")}</p>
								</div>
							)}
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
