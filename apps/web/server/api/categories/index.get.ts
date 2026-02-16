type Category = {
	name: string;
	slug: string;
	componentCount: number;
};

const categories: Category[] = [
	{ name: "CPU", slug: "cpu", componentCount: 0 },
	{ name: "GPU", slug: "gpu", componentCount: 0 },
	{ name: "Motherboard", slug: "motherboard", componentCount: 0 },
	{ name: "RAM", slug: "ram", componentCount: 0 },
	{ name: "Storage", slug: "storage", componentCount: 0 },
	{ name: "PSU", slug: "psu", componentCount: 0 },
	{ name: "Case", slug: "case", componentCount: 0 },
	{ name: "Cooler", slug: "cooler", componentCount: 0 },
];

export default defineEventHandler(() => {
	return categories;
});
