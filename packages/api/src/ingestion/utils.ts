export function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export function normalizeSearchText(value: string): string {
	return normalizeWhitespace(value).toLowerCase();
}

export function hashString(value: string): string {
	let hash = 5381;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 33) ^ value.charCodeAt(index);
	}
	return Math.abs(hash >>> 0).toString(36);
}

export function extractKabumProductId(url: string): string | undefined {
	const match = url.match(/\/produto\/(\d+)\//i);
	return match?.[1];
}

export function parsePriceToCents(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.round(value * 100);
	}

	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return null;
	}

	const normalized = trimmed
		.replace(/[R$\s]/g, "")
		.replace(/\.(?=\d{3}(?:\D|$))/g, "")
		.replace(",", ".");

	const parsed = Number.parseFloat(normalized);
	return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

export function randomId(prefix: string): string {
	const randomPart = Math.random().toString(36).slice(2, 10);
	const timestampPart = Date.now().toString(36);
	return `${prefix}-${timestampPart}-${randomPart}`;
}
