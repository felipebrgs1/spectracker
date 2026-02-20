export default defineEventHandler(async (event) => {
	const config = useRuntimeConfig(event);
	const id = getRouterParam(event, "id");
	if (!id) throw createError({ statusCode: 400, statusMessage: "ID is required" });
	return $fetch(`${config.apiUrl}/gpu-specs/${id}`);
});
