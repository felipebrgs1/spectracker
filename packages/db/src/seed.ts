import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import {
	buildItems,
	builds,
} from "./schema/builds.ts";
import { categories } from "./schema/categories.ts";
import { compatibilityRules } from "./schema/compatibility-rules.ts";
import { componentSpecs, components } from "./schema/components.ts";
import {
	priceHistory,
	sourceOffers,
} from "./schema/ingestion.ts";

dotenv.config({
	path: "../../apps/server/.env",
});

const databaseUrl = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || "";
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN || process.env.NUXT_DATABASE_AUTH_TOKEN;

if (!databaseUrl) {
	throw new Error("DATABASE_URL (or NUXT_DATABASE_URL) is required to run the seed.");
}

const client = createClient({
	url: databaseUrl,
	authToken: databaseAuthToken,
});

const db = drizzle(client);

type CategorySeed = {
	id: string;
	name: string;
	slug: string;
	icon: string;
	sortOrder: number;
};

type ComponentSeed = {
	categorySlug: string;
	brand: string;
	model: string;
	price: number;
	releaseDate: string;
	specs: Record<string, string>;
};

const categorySeed: CategorySeed[] = [
	{ id: "cat-cpu", name: "CPU", slug: "cpu", icon: "lucide:cpu", sortOrder: 1 },
	{ id: "cat-gpu", name: "GPU", slug: "gpu", icon: "lucide:monitor", sortOrder: 2 },
	{
		id: "cat-motherboard",
		name: "Motherboard",
		slug: "motherboard",
		icon: "lucide:circuit-board",
		sortOrder: 3,
	},
	{ id: "cat-ram", name: "RAM", slug: "ram", icon: "lucide:memory-stick", sortOrder: 4 },
	{
		id: "cat-storage",
		name: "Storage",
		slug: "storage",
		icon: "lucide:hard-drive",
		sortOrder: 5,
	},
	{
		id: "cat-psu",
		name: "PSU",
		slug: "psu",
		icon: "lucide:zap",
		sortOrder: 6,
	},
	{ id: "cat-case", name: "Case", slug: "case", icon: "lucide:box", sortOrder: 7 },
	{ id: "cat-cooler", name: "Cooler", slug: "cooler", icon: "lucide:fan", sortOrder: 8 },
];

const componentSeed: ComponentSeed[] = [
	{
		categorySlug: "cpu",
		brand: "AMD",
		model: "Ryzen 5 7600",
		price: 119900,
		releaseDate: "2024-01-11",
		specs: { socket: "AM5", tdp: "65" },
	},
	{
		categorySlug: "cpu",
		brand: "AMD",
		model: "Ryzen 7 7700X",
		price: 179900,
		releaseDate: "2023-09-18",
		specs: { socket: "AM5", tdp: "105" },
	},
	{
		categorySlug: "cpu",
		brand: "AMD",
		model: "Ryzen 7 7800X3D",
		price: 239900,
		releaseDate: "2023-04-06",
		specs: { socket: "AM5", tdp: "120" },
	},
	{
		categorySlug: "cpu",
		brand: "AMD",
		model: "Ryzen 9 7900",
		price: 259900,
		releaseDate: "2023-01-10",
		specs: { socket: "AM5", tdp: "65" },
	},
	{
		categorySlug: "cpu",
		brand: "AMD",
		model: "Ryzen 9 7950X",
		price: 329900,
		releaseDate: "2022-09-27",
		specs: { socket: "AM5", tdp: "170" },
	},
	{
		categorySlug: "cpu",
		brand: "Intel",
		model: "Core i5-13400F",
		price: 129900,
		releaseDate: "2023-01-03",
		specs: { socket: "LGA1700", tdp: "65" },
	},
	{
		categorySlug: "cpu",
		brand: "Intel",
		model: "Core i5-13600K",
		price: 179900,
		releaseDate: "2022-10-20",
		specs: { socket: "LGA1700", tdp: "125" },
	},
	{
		categorySlug: "cpu",
		brand: "Intel",
		model: "Core i7-13700K",
		price: 239900,
		releaseDate: "2022-10-20",
		specs: { socket: "LGA1700", tdp: "125" },
	},
	{
		categorySlug: "cpu",
		brand: "Intel",
		model: "Core i7-14700K",
		price: 279900,
		releaseDate: "2023-10-17",
		specs: { socket: "LGA1700", tdp: "125" },
	},
	{
		categorySlug: "cpu",
		brand: "Intel",
		model: "Core i9-14900K",
		price: 379900,
		releaseDate: "2023-10-17",
		specs: { socket: "LGA1700", tdp: "125" },
	},

	{
		categorySlug: "gpu",
		brand: "NVIDIA",
		model: "GeForce RTX 4060",
		price: 179900,
		releaseDate: "2023-06-29",
		specs: { length_mm: "242", tdp: "115" },
	},
	{
		categorySlug: "gpu",
		brand: "NVIDIA",
		model: "GeForce RTX 4060 Ti",
		price: 219900,
		releaseDate: "2023-05-24",
		specs: { length_mm: "245", tdp: "160" },
	},
	{
		categorySlug: "gpu",
		brand: "NVIDIA",
		model: "GeForce RTX 4070",
		price: 289900,
		releaseDate: "2023-04-13",
		specs: { length_mm: "267", tdp: "200" },
	},
	{
		categorySlug: "gpu",
		brand: "NVIDIA",
		model: "GeForce RTX 4070 SUPER",
		price: 339900,
		releaseDate: "2024-01-17",
		specs: { length_mm: "300", tdp: "220" },
	},
	{
		categorySlug: "gpu",
		brand: "NVIDIA",
		model: "GeForce RTX 4070 Ti SUPER",
		price: 419900,
		releaseDate: "2024-01-24",
		specs: { length_mm: "305", tdp: "285" },
	},
	{
		categorySlug: "gpu",
		brand: "NVIDIA",
		model: "GeForce RTX 4080 SUPER",
		price: 549900,
		releaseDate: "2024-01-31",
		specs: { length_mm: "310", tdp: "320" },
	},
	{
		categorySlug: "gpu",
		brand: "AMD",
		model: "Radeon RX 7600",
		price: 159900,
		releaseDate: "2023-05-25",
		specs: { length_mm: "267", tdp: "165" },
	},
	{
		categorySlug: "gpu",
		brand: "AMD",
		model: "Radeon RX 7700 XT",
		price: 239900,
		releaseDate: "2023-09-06",
		specs: { length_mm: "280", tdp: "245" },
	},
	{
		categorySlug: "gpu",
		brand: "AMD",
		model: "Radeon RX 7800 XT",
		price: 279900,
		releaseDate: "2023-09-06",
		specs: { length_mm: "287", tdp: "263" },
	},
	{
		categorySlug: "gpu",
		brand: "AMD",
		model: "Radeon RX 7900 XTX",
		price: 589900,
		releaseDate: "2022-12-13",
		specs: { length_mm: "330", tdp: "355" },
	},

	{
		categorySlug: "motherboard",
		brand: "ASUS",
		model: "TUF Gaming B650-Plus",
		price: 159900,
		releaseDate: "2023-02-01",
		specs: { socket: "AM5", ddr_support: "DDR5", form_factor: "ATX", m2_slots: "3" },
	},
	{
		categorySlug: "motherboard",
		brand: "MSI",
		model: "MAG B650 Tomahawk",
		price: 169900,
		releaseDate: "2023-03-10",
		specs: { socket: "AM5", ddr_support: "DDR5", form_factor: "ATX", m2_slots: "3" },
	},
	{
		categorySlug: "motherboard",
		brand: "Gigabyte",
		model: "B650 Aorus Elite AX",
		price: 179900,
		releaseDate: "2023-02-15",
		specs: { socket: "AM5", ddr_support: "DDR5", form_factor: "ATX", m2_slots: "3" },
	},
	{
		categorySlug: "motherboard",
		brand: "ASRock",
		model: "B650M Pro RS",
		price: 129900,
		releaseDate: "2023-01-20",
		specs: { socket: "AM5", ddr_support: "DDR5", form_factor: "mATX", m2_slots: "2" },
	},
	{
		categorySlug: "motherboard",
		brand: "ASUS",
		model: "ROG Strix X670E-E",
		price: 319900,
		releaseDate: "2022-10-05",
		specs: { socket: "AM5", ddr_support: "DDR5", form_factor: "ATX", m2_slots: "4" },
	},
	{
		categorySlug: "motherboard",
		brand: "MSI",
		model: "PRO B760M-A DDR5",
		price: 119900,
		releaseDate: "2023-01-03",
		specs: { socket: "LGA1700", ddr_support: "DDR5", form_factor: "mATX", m2_slots: "2" },
	},
	{
		categorySlug: "motherboard",
		brand: "Gigabyte",
		model: "B760 Gaming X AX",
		price: 139900,
		releaseDate: "2023-01-15",
		specs: { socket: "LGA1700", ddr_support: "DDR5", form_factor: "ATX", m2_slots: "3" },
	},
	{
		categorySlug: "motherboard",
		brand: "ASUS",
		model: "Prime Z790-P",
		price: 209900,
		releaseDate: "2022-10-20",
		specs: { socket: "LGA1700", ddr_support: "DDR5", form_factor: "ATX", m2_slots: "3" },
	},
	{
		categorySlug: "motherboard",
		brand: "MSI",
		model: "MAG Z790 Tomahawk",
		price: 249900,
		releaseDate: "2022-10-20",
		specs: { socket: "LGA1700", ddr_support: "DDR5", form_factor: "ATX", m2_slots: "4" },
	},
	{
		categorySlug: "motherboard",
		brand: "ASRock",
		model: "H610M-HDV",
		price: 69900,
		releaseDate: "2022-01-10",
		specs: { socket: "LGA1700", ddr_support: "DDR4", form_factor: "mATX", m2_slots: "1" },
	},

	{
		categorySlug: "ram",
		brand: "Corsair",
		model: "Vengeance 16GB DDR4 3200",
		price: 29900,
		releaseDate: "2022-04-11",
		specs: { ddr_generation: "DDR4", capacity_gb: "16", speed_mhz: "3200" },
	},
	{
		categorySlug: "ram",
		brand: "Corsair",
		model: "Vengeance 32GB DDR4 3600",
		price: 49900,
		releaseDate: "2022-04-11",
		specs: { ddr_generation: "DDR4", capacity_gb: "32", speed_mhz: "3600" },
	},
	{
		categorySlug: "ram",
		brand: "Kingston",
		model: "Fury Beast 16GB DDR5 5200",
		price: 35900,
		releaseDate: "2023-03-18",
		specs: { ddr_generation: "DDR5", capacity_gb: "16", speed_mhz: "5200" },
	},
	{
		categorySlug: "ram",
		brand: "Kingston",
		model: "Fury Beast 32GB DDR5 5600",
		price: 55900,
		releaseDate: "2023-03-18",
		specs: { ddr_generation: "DDR5", capacity_gb: "32", speed_mhz: "5600" },
	},
	{
		categorySlug: "ram",
		brand: "G.Skill",
		model: "Ripjaws S5 32GB DDR5 6000",
		price: 65900,
		releaseDate: "2023-05-21",
		specs: { ddr_generation: "DDR5", capacity_gb: "32", speed_mhz: "6000" },
	},
	{
		categorySlug: "ram",
		brand: "G.Skill",
		model: "Trident Z5 32GB DDR5 6400",
		price: 79900,
		releaseDate: "2023-09-02",
		specs: { ddr_generation: "DDR5", capacity_gb: "32", speed_mhz: "6400" },
	},
	{
		categorySlug: "ram",
		brand: "Crucial",
		model: "Pro 16GB DDR5 4800",
		price: 31900,
		releaseDate: "2023-01-14",
		specs: { ddr_generation: "DDR5", capacity_gb: "16", speed_mhz: "4800" },
	},
	{
		categorySlug: "ram",
		brand: "Crucial",
		model: "Pro 32GB DDR5 5600",
		price: 57900,
		releaseDate: "2023-01-14",
		specs: { ddr_generation: "DDR5", capacity_gb: "32", speed_mhz: "5600" },
	},
	{
		categorySlug: "ram",
		brand: "TeamGroup",
		model: "T-Force Delta 32GB DDR5 6000",
		price: 67900,
		releaseDate: "2023-08-30",
		specs: { ddr_generation: "DDR5", capacity_gb: "32", speed_mhz: "6000" },
	},
	{
		categorySlug: "ram",
		brand: "ADATA",
		model: "XPG Lancer 16GB DDR5 5200",
		price: 34900,
		releaseDate: "2023-02-07",
		specs: { ddr_generation: "DDR5", capacity_gb: "16", speed_mhz: "5200" },
	},

	{
		categorySlug: "storage",
		brand: "Samsung",
		model: "980 1TB NVMe",
		price: 44900,
		releaseDate: "2022-07-01",
		specs: { interface: "nvme", capacity_gb: "1000" },
	},
	{
		categorySlug: "storage",
		brand: "Samsung",
		model: "990 Pro 1TB NVMe",
		price: 69900,
		releaseDate: "2023-01-17",
		specs: { interface: "nvme", capacity_gb: "1000" },
	},
	{
		categorySlug: "storage",
		brand: "WD",
		model: "Black SN770 1TB NVMe",
		price: 42900,
		releaseDate: "2022-05-09",
		specs: { interface: "nvme", capacity_gb: "1000" },
	},
	{
		categorySlug: "storage",
		brand: "WD",
		model: "Black SN850X 2TB NVMe",
		price: 99900,
		releaseDate: "2022-08-01",
		specs: { interface: "nvme", capacity_gb: "2000" },
	},
	{
		categorySlug: "storage",
		brand: "Kingston",
		model: "NV2 1TB NVMe",
		price: 34900,
		releaseDate: "2022-10-10",
		specs: { interface: "nvme", capacity_gb: "1000" },
	},
	{
		categorySlug: "storage",
		brand: "Crucial",
		model: "P3 Plus 1TB NVMe",
		price: 39900,
		releaseDate: "2022-09-05",
		specs: { interface: "nvme", capacity_gb: "1000" },
	},
	{
		categorySlug: "storage",
		brand: "Seagate",
		model: "Barracuda 2TB HDD",
		price: 29900,
		releaseDate: "2021-12-01",
		specs: { interface: "sata", capacity_gb: "2000" },
	},
	{
		categorySlug: "storage",
		brand: "Seagate",
		model: "FireCuda 530 1TB NVMe",
		price: 74900,
		releaseDate: "2022-06-15",
		specs: { interface: "nvme", capacity_gb: "1000" },
	},
	{
		categorySlug: "storage",
		brand: "Kingston",
		model: "A400 960GB SATA",
		price: 27900,
		releaseDate: "2021-08-20",
		specs: { interface: "sata", capacity_gb: "960" },
	},
	{
		categorySlug: "storage",
		brand: "Sandisk",
		model: "Ultra 3D 1TB SATA",
		price: 35900,
		releaseDate: "2022-02-03",
		specs: { interface: "sata", capacity_gb: "1000" },
	},

	{
		categorySlug: "psu",
		brand: "Corsair",
		model: "CV550 550W Bronze",
		price: 29900,
		releaseDate: "2021-11-02",
		specs: { wattage: "550", efficiency: "80+ Bronze" },
	},
	{
		categorySlug: "psu",
		brand: "Corsair",
		model: "RM650e 650W Gold",
		price: 49900,
		releaseDate: "2023-02-09",
		specs: { wattage: "650", efficiency: "80+ Gold" },
	},
	{
		categorySlug: "psu",
		brand: "Corsair",
		model: "RM750e 750W Gold",
		price: 57900,
		releaseDate: "2023-02-09",
		specs: { wattage: "750", efficiency: "80+ Gold" },
	},
	{
		categorySlug: "psu",
		brand: "Cooler Master",
		model: "MWE 650W Bronze V2",
		price: 36900,
		releaseDate: "2022-06-12",
		specs: { wattage: "650", efficiency: "80+ Bronze" },
	},
	{
		categorySlug: "psu",
		brand: "Cooler Master",
		model: "MWE 750W Gold V2",
		price: 56900,
		releaseDate: "2022-06-12",
		specs: { wattage: "750", efficiency: "80+ Gold" },
	},
	{
		categorySlug: "psu",
		brand: "Seasonic",
		model: "Focus GX-750 750W Gold",
		price: 69900,
		releaseDate: "2022-03-01",
		specs: { wattage: "750", efficiency: "80+ Gold" },
	},
	{
		categorySlug: "psu",
		brand: "Seasonic",
		model: "Focus GX-850 850W Gold",
		price: 82900,
		releaseDate: "2022-03-01",
		specs: { wattage: "850", efficiency: "80+ Gold" },
	},
	{
		categorySlug: "psu",
		brand: "MSI",
		model: "MAG A650BN 650W Bronze",
		price: 32900,
		releaseDate: "2022-09-19",
		specs: { wattage: "650", efficiency: "80+ Bronze" },
	},
	{
		categorySlug: "psu",
		brand: "XPG",
		model: "Core Reactor 750W Gold",
		price: 62900,
		releaseDate: "2022-11-11",
		specs: { wattage: "750", efficiency: "80+ Gold" },
	},
	{
		categorySlug: "psu",
		brand: "Thermaltake",
		model: "Toughpower GF1 850W Gold",
		price: 84900,
		releaseDate: "2023-04-18",
		specs: { wattage: "850", efficiency: "80+ Gold" },
	},

	{
		categorySlug: "case",
		brand: "NZXT",
		model: "H5 Flow",
		price: 49900,
		releaseDate: "2022-10-25",
		specs: { max_form_factor: "ATX", max_gpu_length_mm: "365" },
	},
	{
		categorySlug: "case",
		brand: "NZXT",
		model: "H7 Flow",
		price: 69900,
		releaseDate: "2022-10-25",
		specs: { max_form_factor: "ATX", max_gpu_length_mm: "400" },
	},
	{
		categorySlug: "case",
		brand: "Corsair",
		model: "4000D Airflow",
		price: 59900,
		releaseDate: "2021-09-14",
		specs: { max_form_factor: "ATX", max_gpu_length_mm: "360" },
	},
	{
		categorySlug: "case",
		brand: "Corsair",
		model: "5000D Airflow",
		price: 89900,
		releaseDate: "2021-09-14",
		specs: { max_form_factor: "ATX", max_gpu_length_mm: "400" },
	},
	{
		categorySlug: "case",
		brand: "Lian Li",
		model: "Lancool 216",
		price: 67900,
		releaseDate: "2022-12-01",
		specs: { max_form_factor: "ATX", max_gpu_length_mm: "392" },
	},
	{
		categorySlug: "case",
		brand: "Lian Li",
		model: "O11 Dynamic Mini",
		price: 79900,
		releaseDate: "2021-06-20",
		specs: { max_form_factor: "ATX", max_gpu_length_mm: "395" },
	},
	{
		categorySlug: "case",
		brand: "Cooler Master",
		model: "MasterBox Q300L",
		price: 26900,
		releaseDate: "2021-05-10",
		specs: { max_form_factor: "mATX", max_gpu_length_mm: "360" },
	},
	{
		categorySlug: "case",
		brand: "DeepCool",
		model: "CH370",
		price: 34900,
		releaseDate: "2023-03-07",
		specs: { max_form_factor: "mATX", max_gpu_length_mm: "320" },
	},
	{
		categorySlug: "case",
		brand: "Fractal",
		model: "North",
		price: 99900,
		releaseDate: "2023-01-15",
		specs: { max_form_factor: "ATX", max_gpu_length_mm: "355" },
	},
	{
		categorySlug: "case",
		brand: "Montech",
		model: "Air 100",
		price: 29900,
		releaseDate: "2022-08-08",
		specs: { max_form_factor: "mATX", max_gpu_length_mm: "330" },
	},

	{
		categorySlug: "cooler",
		brand: "Cooler Master",
		model: "Hyper 212 Black",
		price: 22900,
		releaseDate: "2021-10-09",
		specs: { max_tdp: "150", type: "air" },
	},
	{
		categorySlug: "cooler",
		brand: "DeepCool",
		model: "AK400",
		price: 24900,
		releaseDate: "2022-04-02",
		specs: { max_tdp: "220", type: "air" },
	},
	{
		categorySlug: "cooler",
		brand: "DeepCool",
		model: "AK620",
		price: 39900,
		releaseDate: "2022-04-02",
		specs: { max_tdp: "260", type: "air" },
	},
	{
		categorySlug: "cooler",
		brand: "Noctua",
		model: "NH-U12S redux",
		price: 34900,
		releaseDate: "2022-03-22",
		specs: { max_tdp: "180", type: "air" },
	},
	{
		categorySlug: "cooler",
		brand: "Noctua",
		model: "NH-D15",
		price: 69900,
		releaseDate: "2021-12-15",
		specs: { max_tdp: "280", type: "air" },
	},
	{
		categorySlug: "cooler",
		brand: "Corsair",
		model: "H100i 240mm",
		price: 69900,
		releaseDate: "2022-11-19",
		specs: { max_tdp: "260", type: "aio" },
	},
	{
		categorySlug: "cooler",
		brand: "Corsair",
		model: "H150i 360mm",
		price: 99900,
		releaseDate: "2022-11-19",
		specs: { max_tdp: "320", type: "aio" },
	},
	{
		categorySlug: "cooler",
		brand: "NZXT",
		model: "Kraken 240",
		price: 79900,
		releaseDate: "2023-02-14",
		specs: { max_tdp: "280", type: "aio" },
	},
	{
		categorySlug: "cooler",
		brand: "Thermalright",
		model: "Peerless Assassin 120",
		price: 27900,
		releaseDate: "2022-09-09",
		specs: { max_tdp: "250", type: "air" },
	},
	{
		categorySlug: "cooler",
		brand: "Arctic",
		model: "Liquid Freezer II 280",
		price: 84900,
		releaseDate: "2022-05-05",
		specs: { max_tdp: "300", type: "aio" },
	},
];

const categoryBySlug = Object.fromEntries(
	categorySeed.map((category) => [category.slug, category.id]),
);

const componentRows = componentSeed.map((component, index) => {
	const id = `cmp-${String(index + 1).padStart(4, "0")}`;
	return {
		id,
		categoryId: categoryBySlug[component.categorySlug] as string,
		name: `${component.brand} ${component.model}`,
		brand: component.brand,
		model: component.model,
		price: component.price,
		releaseDate: component.releaseDate,
		isActive: true,
	};
});

const specRows = componentSeed.flatMap((component, index) => {
	const componentId = `cmp-${String(index + 1).padStart(4, "0")}`;
	return Object.entries(component.specs).map(([specKey, specValue], specIndex) => {
		return {
			id: `spec-${String(index + 1).padStart(4, "0")}-${String(specIndex + 1).padStart(2, "0")}`,
			componentId,
			specKey,
			specValue,
		};
	});
});

const ruleRows = [
	{
		id: "rule-01",
		sourceCategoryId: categoryBySlug.cpu,
		targetCategoryId: categoryBySlug.motherboard,
		ruleType: "spec_match",
		sourceSpecKey: "socket",
		targetSpecKey: "socket",
		operator: "eq",
		description: "CPU socket must match motherboard socket.",
	},
	{
		id: "rule-02",
		sourceCategoryId: categoryBySlug.ram,
		targetCategoryId: categoryBySlug.motherboard,
		ruleType: "spec_match",
		sourceSpecKey: "ddr_generation",
		targetSpecKey: "ddr_support",
		operator: "eq",
		description: "RAM generation must match motherboard DDR support.",
	},
	{
		id: "rule-03",
		sourceCategoryId: categoryBySlug.cpu,
		targetCategoryId: categoryBySlug.cooler,
		ruleType: "numeric_limit",
		sourceSpecKey: "tdp",
		targetSpecKey: "max_tdp",
		operator: "lte",
		description: "CPU TDP must be lower than or equal to cooler max TDP.",
	},
	{
		id: "rule-04",
		sourceCategoryId: categoryBySlug.gpu,
		targetCategoryId: categoryBySlug.case,
		ruleType: "numeric_limit",
		sourceSpecKey: "length_mm",
		targetSpecKey: "max_gpu_length_mm",
		operator: "lte",
		description: "GPU length must fit in the case.",
	},
	{
		id: "rule-05",
		sourceCategoryId: categoryBySlug.motherboard,
		targetCategoryId: categoryBySlug.case,
		ruleType: "form_factor",
		sourceSpecKey: "form_factor",
		targetSpecKey: "max_form_factor",
		operator: "fit",
		description: "Motherboard form factor must be supported by the case.",
	},
	{
		id: "rule-06",
		sourceCategoryId: null,
		targetCategoryId: categoryBySlug.psu,
		ruleType: "power_budget",
		sourceSpecKey: "total_tdp",
		targetSpecKey: "wattage",
		operator: "lte",
		description: "Estimated total TDP should be lower than PSU wattage.",
	},
	{
		id: "rule-07",
		sourceCategoryId: categoryBySlug.storage,
		targetCategoryId: categoryBySlug.motherboard,
		ruleType: "slot_capacity",
		sourceSpecKey: "interface",
		targetSpecKey: "m2_slots",
		operator: "slot",
		description: "M.2 storage quantity should not exceed motherboard M.2 slots.",
	},
];

async function seed() {
	await db.delete(priceHistory);
	await db.delete(sourceOffers);
	await db.delete(buildItems);
	await db.delete(builds);
	await db.delete(componentSpecs);
	await db.delete(compatibilityRules);
	await db.delete(components);
	await db.delete(categories);

	await db.insert(categories).values(categorySeed);
	await db.insert(components).values(componentRows);
	await db.insert(componentSpecs).values(specRows);
	await db.insert(compatibilityRules).values(ruleRows);

	console.log(
		`Seed completed: ${categorySeed.length} categories, ${componentRows.length} components, ${specRows.length} specs, ${ruleRows.length} rules.`,
	);
}

seed()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await client.close();
	});
