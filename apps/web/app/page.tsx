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
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface DashboardOverview {
	stats: {
		components: number;
		builds: number;
		categories: number;
	};
}

interface Category {
	name: string;
	slug: string;
	componentCount: number;
}

const iconBySlug = {
	cpu: Cpu,
	gpu: Monitor,
	motherboard: CircuitBoard,
	ram: MemoryStick,
	storage: HardDrive,
	psu: Zap,
	case: Box,
	cooler: Fan,
} as const;

const colorBySlug = {
	cpu: "text-blue-500",
	gpu: "text-green-500",
	motherboard: "text-purple-500",
	ram: "text-amber-500",
	storage: "text-rose-500",
	psu: "text-yellow-500",
	case: "text-cyan-500",
	cooler: "text-teal-500",
} as const;

async function getDashboardData() {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const overviewRes = await fetch(`${baseUrl}/api/dashboard/overview`, {
		cache: "no-store",
	});
	const categoriesRes = await fetch(`${baseUrl}/api/categories`, {
		next: { revalidate: 3600 },
	});

	const overview: DashboardOverview = await overviewRes.json().catch(() => ({
		stats: { components: 0, builds: 0, categories: 0 },
	}));
	const categoriesResponse: Category[] = await categoriesRes.json().catch(() => []);

	return { overview, categoriesResponse };
}

export default async function Home() {
	const { overview, categoriesResponse } = await getDashboardData();

	const categories = categoriesResponse.map((category) => {
		const Icon = iconBySlug[category.slug as keyof typeof iconBySlug] || Cpu;
		const color = colorBySlug[category.slug as keyof typeof colorBySlug] || "text-muted-foreground";
		return { ...category, Icon, color };
	});

	const statsItems = [
		{
			label: "Components",
			value: String(overview.stats.components),
			description: "in database",
			icon: Cpu,
		},
		{
			label: "Builds",
			value: String(overview.stats.builds),
			description: "created",
			icon: Box,
		},
		{
			label: "Categories",
			value: String(overview.stats.categories || categories.length),
			description: "available",
			icon: CircuitBoard,
		},
	];

	return (
		<div className="space-y-8">
			{/* Hero section */}
			<div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/5 via-background to-primary/10 p-8 md:p-12">
				<div className="absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-primary/5 blur-3xl" />
				<div className="relative">
					<Badge variant="secondary" className="mb-4">
						<span className="mr-1 inline-block size-2 animate-pulse rounded-full bg-primary" />
						Early Development
					</Badge>
					<h1 className="text-3xl font-bold tracking-tight md:text-4xl text-foreground">
						Build Your Perfect PC
					</h1>
					<p className="mt-2 max-w-lg text-muted-foreground">
						Choose components, check compatibility in real-time, and create your ideal build with
						confidence.
					</p>
					<div className="mt-6 flex flex-wrap gap-3">
						<Button size="lg" className="gap-2">
							<Plus className="size-4" />
							New Build
						</Button>
						<Button variant="outline" size="lg" className="gap-2">
							Browse Components
							<ArrowRight className="size-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-4 sm:grid-cols-3">
				{statsItems.map((stat) => (
					<Card key={stat.label} className="transition-shadow hover:shadow-md">
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardDescription className="text-sm font-medium">{stat.label}</CardDescription>
							<stat.icon className="size-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold font-mono">{stat.value}</div>
							<p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Categories grid */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h2 className="text-xl font-semibold tracking-tight">Component Categories</h2>
						<p className="text-sm text-muted-foreground">Browse components by type</p>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{categories.map((category) => (
						<Link key={category.slug} href={`/components/${category.slug}`} className="block">
							<Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
								<CardContent className="flex items-center gap-4 p-4">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10">
										<category.Icon className={`size-5 transition-colors ${category.color}`} />
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium">{category.name}</p>
										<p className="text-xs text-muted-foreground">{category.componentCount} items</p>
									</div>
									<ArrowRight className="size-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			</div>

			{/* Recent Builds (empty state) */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h2 className="text-xl font-semibold tracking-tight">Recent Builds</h2>
						<p className="text-sm text-muted-foreground">Your latest PC configurations</p>
					</div>
				</div>
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-12">
						<div className="flex size-12 items-center justify-center rounded-full bg-muted">
							<Box className="size-6 text-muted-foreground" />
						</div>
						<h3 className="mt-4 text-sm font-medium">No builds yet</h3>
						<p className="mt-1 text-center text-sm text-muted-foreground">
							Start building your first PC configuration
						</p>
						<Button className="mt-4 gap-2" size="sm">
							<Plus className="size-4" />
							Create your first build
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
