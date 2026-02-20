export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	const query = getQuery(event);
	const search = query.search ? `search=${encodeURIComponent(query.search as string)}` : "";
	const limit = query.limit ? `limit=${query.limit}` : "";
	const args = [search, limit].filter(Boolean).join("&");
	const queryString = args.length > 0 ? `?${args}` : "";
	return $fetch(`${config.apiUrl}/gpu-specs${queryString}`);
});
