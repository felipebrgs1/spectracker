export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	const query = getQuery(event);
	const queryString = query.category ? `?category=${query.category}` : "";
	return $fetch(`${config.apiUrl}/catalog/components${queryString}`);
});
