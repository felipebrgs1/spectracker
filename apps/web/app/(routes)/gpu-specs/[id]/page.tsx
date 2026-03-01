import {
	Cpu,
	Gauge,
	MemoryStick,
	Database,
	Cable,
	Zap,
	CalendarDays,
	ExternalLink,
	ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

import { type GpuCatalogItem } from "@spectracker/contracts";

import { api } from "@/lib/api";

async function getGpuDetail(id: string): Promise<GpuCatalogItem | null> {
	try {
		return await api<GpuCatalogItem>(`/gpu-specs/${id}`);
	} catch (error: any) {
		if (error.status === 404) return null;
		console.error("Failed to fetch GPU detail:", error);
		throw new Error("Failed to fetch GPU detail");
	}
}

export default async function GpuDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const data = await getGpuDetail(id);

	if (!data) {
		notFound();
		return null;
	}

	const specs = data.specs || {};
	const rows = [
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

	const availableRows = rows.filter((row) => row.value !== "-");
	const missingRows = rows.filter((row) => row.value === "-");

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
					<p className="text-sm text-muted-foreground">Specs principais do chip</p>
				</div>
				<div className="flex items-center gap-2">
					<Button asChild variant="outline" size="sm">
						<a
							href={data.url}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1"
						>
							Fonte <ExternalLink className="size-3.5" />
						</a>
					</Button>
					<Button asChild variant="outline" size="sm">
						<Link href="/gpu-specs" className="inline-flex items-center gap-1">
							<ChevronLeft className="size-3.5" />
							Voltar
						</Link>
					</Button>
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
				<Card className="h-fit">
					<CardContent className="p-3">
						<div className="aspect-4/3verflow-hidden rounded-md border bg-muted/30">
							{data.imageUrl ? (
								<Image src={data.imageUrl} alt={data.name} fill className="object-cover" />
							) : (
								<div className="flex size-full items-center justify-center">
									<Cpu className="size-8 text-muted-foreground" />
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Specs</CardTitle>
					</CardHeader>
					<CardContent>
						{availableRows.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-6">
								Este modelo não possui especificações detalhadas no momento.
							</p>
						) : (
							<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
								{availableRows.map((row) => (
									<div key={row.key} className="rounded-md border p-3">
										<p className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
											<row.icon className="size-3" />
											{row.label}
										</p>
										<p className="mt-1 text-sm font-semibold wrap-break-wordword">{row.value}</p>
									</div>
								))}
							</div>
						)}
						{missingRows.length > 0 && availableRows.length > 0 && (
							<p className="mt-4 text-[10px] text-muted-foreground italic">
								* Alguns campos não disponíveis para este modelo.
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
