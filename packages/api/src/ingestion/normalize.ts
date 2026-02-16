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
