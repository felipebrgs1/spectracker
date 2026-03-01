import { Cpu } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface ComponentItem {
	id: string;
	name: string;
	category: string;
	price: number;
	store?: string;
	inStock?: boolean;
}

interface ComponentsResponse {
	items: ComponentItem[];
	total: number;
}

async function getComponents() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const res = await fetch(`${baseUrl}/api/components`, {
		cache: "no-store",
	});

	if (!res.ok) {
		return { items: [], total: 0 };
	}

	return await res.json();
}

export default async function ComponentsPage() {
	const data: ComponentsResponse = await getComponents();

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
