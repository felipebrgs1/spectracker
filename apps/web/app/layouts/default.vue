<script setup lang="ts">
import { Cpu, Moon, Sun, Menu, X } from "lucide-vue-next";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { Separator } from "~/components/ui/separator";

const colorMode = useColorMode();
const route = useRoute();
const mobileOpen = ref(false);

function toggleColorMode() {
	colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
}

const navItems = [
	{ label: "Dashboard", to: "/", icon: "layout-dashboard" },
	{ label: "Builder", to: "/build", icon: "wrench" },
	{ label: "Components", to: "/components", icon: "cpu" },
	{ label: "GPU Specs", to: "/gpu-specs", icon: "database" },
];

watch(
	() => route.path,
	() => {
		mobileOpen.value = false;
	},
);
</script>

<template>
	<div class="min-h-svh bg-background">
		<!-- Header -->
		<header class="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
			<div class="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4 sm:px-6 lg:px-8">
				<!-- Logo -->
				<NuxtLink to="/" class="flex items-center gap-2 font-semibold tracking-tight">
					<div class="flex size-8 items-center justify-center rounded-lg bg-primary">
						<Cpu class="size-4 text-primary-foreground" />
					</div>
					<span class="hidden sm:inline-block">SpecTracker</span>
				</NuxtLink>

				<!-- Desktop nav -->
				<nav class="hidden items-center gap-1 md:flex">
					<NuxtLink
						v-for="item in navItems"
						:key="item.to"
						:to="item.to"
						class="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
						:class="
							route.path === item.to ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
						"
					>
						{{ item.label }}
					</NuxtLink>
				</nav>

				<div class="flex-1" />

				<!-- Actions -->
				<div class="flex items-center gap-2">
					<ClientOnly>
						<Button variant="ghost" size="icon" @click="toggleColorMode">
							<Sun v-if="colorMode.value === 'dark'" class="size-4" />
							<Moon v-else class="size-4" />
							<span class="sr-only">Toggle theme</span>
						</Button>
						<template #fallback>
							<Button variant="ghost" size="icon" disabled>
								<div class="size-4" />
							</Button>
						</template>
					</ClientOnly>

					<!-- Mobile menu -->
					<Sheet v-model:open="mobileOpen">
						<SheetTrigger as-child>
							<Button variant="ghost" size="icon" class="md:hidden">
								<Menu class="size-4" />
								<span class="sr-only">Open menu</span>
							</Button>
						</SheetTrigger>
						<SheetContent side="right" class="w-72">
							<div class="flex flex-col gap-4 pt-4">
								<NuxtLink to="/" class="flex items-center gap-2 font-semibold">
									<div class="flex size-8 items-center justify-center rounded-lg bg-primary">
										<Cpu class="size-4 text-primary-foreground" />
									</div>
									SpecTracker
								</NuxtLink>
								<Separator />
								<nav class="flex flex-col gap-1">
									<NuxtLink
										v-for="item in navItems"
										:key="item.to"
										:to="item.to"
										class="flex h-10 items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
										:class="
											route.path === item.to
												? 'bg-accent text-accent-foreground'
												: 'text-muted-foreground'
										"
									>
										{{ item.label }}
									</NuxtLink>
								</nav>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>

		<!-- Content -->
		<main class="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
			<slot />
		</main>
	</div>
</template>
