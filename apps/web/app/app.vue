<script setup lang="ts">
useHead({
	titleTemplate: "%s - SpecTracker",
	link: [
		{
			rel: "preconnect",
			href: "https://fonts.googleapis.com",
		},
		{
			rel: "preconnect",
			href: "https://fonts.gstatic.com",
			crossorigin: "",
		},
		{
			rel: "stylesheet",
			href: "https://fonts.googleapis.com/css2?family=Inter:wght@300..800&family=JetBrains+Mono:wght@400;500;600&display=swap",
		},
	],
	meta: [
		{
			name: "description",
			content: "Build your perfect PC with smart compatibility checking.",
		},
	],
});
</script>

<template>
	<NuxtLoadingIndicator color="#10b981" />
	<NuxtLayout>
		<NuxtPage />
	</NuxtLayout>
</template>
