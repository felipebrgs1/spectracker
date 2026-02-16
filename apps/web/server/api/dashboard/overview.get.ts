import categories from "../categories/index.get";
import components from "../components/index.get";

export default defineEventHandler(async (event) => {
	const categoryList = await categories(event);
	const componentResult = await components(event);

	return {
		stats: {
			components: componentResult.total,
			builds: 0,
			categories: categoryList.length,
		},
	};
});
