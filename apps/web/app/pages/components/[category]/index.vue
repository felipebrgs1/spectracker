<script setup lang="ts">
const route = useRoute();
const category = route.params.category;
</script>

<template>
	<div class="space-y-6">
		<h1 class="text-3xl font-bold tracking-tight">Category: {{ category }}</h1>
	</div>
</template>
