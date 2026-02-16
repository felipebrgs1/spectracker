type ComponentItem = {
	id: string;
	name: string;
	category: string;
	price: number;
};

const components: ComponentItem[] = [];

export default defineEventHandler(() => {
	return {
		items: components,
		total: components.length,
	};
});
