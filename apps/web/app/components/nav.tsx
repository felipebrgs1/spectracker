"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
	{ label: "Dashboard", to: "/", icon: "layout-dashboard" },
	{ label: "Builder", to: "/build", icon: "wrench" },
	{ label: "Components", to: "/components", icon: "cpu" },
	{ label: "GPU Specs", to: "/gpu-specs", icon: "database" },
];

export function Nav() {
	const pathname = usePathname();

	return (
		<nav className="hidden items-center gap-1 md:flex">
			{navItems.map((item) => (
				<Link
					key={item.to}
					href={item.to}
					className={`inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
						pathname === item.to
							? "bg-accent text-accent-foreground"
							: "text-muted-foreground"
					}`}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
}
