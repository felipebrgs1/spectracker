export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	return $fetch(`${config.apiUrl}/dashboard/overview`);
});
