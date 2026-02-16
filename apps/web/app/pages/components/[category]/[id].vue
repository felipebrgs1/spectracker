<script setup lang="ts">
const route = useRoute();
const { category, id } = route.params;
</script>

<template>
	<div class="space-y-6">
		<h1 class="text-3xl font-bold tracking-tight">Component: {{ id }}</h1>
		<p class="text-muted-foreground">Category: {{ category }}</p>
	</div>
</template>
