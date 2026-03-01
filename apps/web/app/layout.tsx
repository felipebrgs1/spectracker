import { Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Cpu } from "lucide-react";
import Link from "next/link";
import "@/globals.css";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: {
		template: "%s - SpecTracker",
		default: "SpecTracker",
	},
	description: "Build your perfect PC with smart compatibility checking.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
			<body className="antialiased">
				<Providers>
					<div className="min-h-svh bg-background">
						{/* Header */}
						<header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
							<div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4 sm:px-6 lg:px-8">
								{/* Logo */}
								<Link
									href="/"
									className="flex items-center gap-2 font-semibold tracking-tight"
								>
									<div className="flex size-8 items-center justify-center rounded-lg bg-primary">
										<Cpu className="size-4 text-primary-foreground" />
									</div>
									<span className="hidden sm:inline-block">SpecTracker</span>
								</Link>

								<Nav />

								<div className="flex-1" />

								{/* Actions */}
								<div className="flex items-center gap-2">
									<ThemeToggle />
								</div>
							</div>
						</header>

						{/* Content */}
						<main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
							{children}
						</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}