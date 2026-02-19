import type { NormalizedOffer, RawOffer } from "./types";
import { normalizeSearchText, normalizeWhitespace } from "./utils";

function detectCpuBrand(title: string): string | null {
	const normalized = normalizeSearchText(title);
	if (normalized.includes("amd") || normalized.includes("ryzen")) {
		return "AMD";
	}
	if (
		normalized.includes("intel") ||
		normalized.includes("core i") ||
		normalized.includes("celeron") ||
		normalized.includes("pentium")
	) {
		return "Intel";
	}
	return null;
}

function detectGpuBrand(title: string): string | null {
	const normalized = normalizeSearchText(title);
	if (/\brtx[\s-]?[345]\d{3}\b/i.test(normalized)) {
		return "NVIDIA";
	}
	if (/\brx[\s-]?[6-9]\d{3}\b/i.test(normalized)) {
		return "AMD";
	}
	if (
		normalized.includes("nvidia") ||
		normalized.includes("geforce") ||
		normalized.includes("rtx")
	) {
		return "NVIDIA";
	}
	if (normalized.includes("amd") || normalized.includes("radeon")) {
		return "AMD";
	}
	return null;
}

function detectRamBrand(title: string): string | null {
	const normalized = normalizeSearchText(title);
	if (normalized.includes("corsair")) return "Corsair";
	if (normalized.includes("kingston")) return "Kingston";
	if (normalized.includes("crucial")) return "Crucial";
	if (normalized.includes("g.skill") || normalized.includes("gskill")) return "G.Skill";
	if (normalized.includes("teamgroup")) return "TeamGroup";
	if (normalized.includes("xpg")) return "XPG";
	if (normalized.includes("adata")) return "ADATA";
	if (normalized.includes("patriot")) return "Patriot";
	return null;
}

function extractCpuModel(title: string, brand: string | null): string | null {
	let model = normalizeWhitespace(title);
	model = model.replace(/\bprocessador\b/gi, "");
	model = model.replace(/\bcpu\b/gi, "");

	if (brand) {
		const brandPattern = new RegExp(`\\b${brand}\\b`, "gi");
		model = model.replace(brandPattern, "");
	}

	model = model.replace(/\b(amd|intel)\b/gi, "");
	model = model.replace(/\s+-\s+/g, " ");
	model = normalizeWhitespace(model);

	return model.length > 2 ? model : null;
}

function extractGpuModel(title: string, brand: string | null): string | null {
	let model = normalizeWhitespace(title);
	model = model.replace(/\bplaca\s+de\s+video\b/gi, "");
	model = model.replace(/\bvga\b/gi, "");
	model = model.replace(/\bgpu\b/gi, "");
	model = model.replace(/\bgeforce\b/gi, "");
	model = model.replace(/\bradeon\b/gi, "");

	if (brand) {
		const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const brandPattern = new RegExp(`\\b${escapedBrand}\\b`, "gi");
		model = model.replace(brandPattern, "");
	}

	model = model.replace(/\s+-\s+/g, " ");
	model = normalizeWhitespace(model);
	return model.length > 2 ? model : null;
}

function extractRamModel(title: string, brand: string | null): string | null {
	let model = normalizeWhitespace(title);
	model = model.replace(/\bmem[oó]ria\s+ram\b/gi, "");
	model = model.replace(/\bram\b/gi, "");

	if (brand) {
		const escapedBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const brandPattern = new RegExp(`\\b${escapedBrand}\\b`, "gi");
		model = model.replace(brandPattern, "");
	}

	model = model.replace(/\s+-\s+/g, " ");
	model = normalizeWhitespace(model);
	return model.length > 2 ? model : null;
}

export function normalizeCpuOffer(rawOffer: RawOffer): NormalizedOffer {
	const normalizedName = normalizeWhitespace(rawOffer.title);
	const brand = detectCpuBrand(normalizedName);
	const model = extractCpuModel(normalizedName, brand);

	return {
		...rawOffer,
		normalizedName,
		brand,
		model,
	};
}

export function normalizeGpuOffer(rawOffer: RawOffer): NormalizedOffer {
	const normalizedName = normalizeWhitespace(rawOffer.title);
	const brand = detectGpuBrand(normalizedName);
	const model = extractGpuModel(normalizedName, brand);

	return {
		...rawOffer,
		normalizedName,
		brand,
		model,
	};
}

export function normalizeRamOffer(rawOffer: RawOffer): NormalizedOffer {
	const normalizedName = normalizeWhitespace(rawOffer.title);
	const brand = detectRamBrand(normalizedName);
	const model = extractRamModel(normalizedName, brand);

	return {
		...rawOffer,
		normalizedName,
		brand,
		model,
	};
}
