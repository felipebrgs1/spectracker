<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const items = computed<NavigationMenuItem[]>(() => [
	{ label: "Home", to: "/", active: route.path === "/" },
]);
</script>

<template>
	<UHeader>
		<template #left>
			<UNavigationMenu :items="items" />
		</template>

		<template #right>
			<UColorModeButton />
		</template>

		<template #body>
			<UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
		</template>
	</UHeader>
</template>
