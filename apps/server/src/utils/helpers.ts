export const DB_QUERY_TIMEOUT_MS = 10000;

export function detectSocketFromText(value: string): string | null {
	const normalized = value.toUpperCase();
	const match = normalized.match(/\b(AM4|AM5|LGA[\s-]?\d{3,4})\b/);
	return match?.[1]?.replace(/\s+/g, " ") ?? null;
}

export function extractCpuModelName(title: string): string | null {
	const clean = title
		.replace(/\bprocessador\b/gi, "")
		.replace(/\bcpu\b/gi, "")
		.replace(/\s+/g, " ")
		.trim();
	const mainPart = clean.split(",")[0]?.trim();
	return mainPart && mainPart.length >= 5 ? mainPart : null;
}

export function extractCpuCores(text: string): string | null {
	const numericMatch = text.match(/\b(\d+)\s*(?:núcleos?|cores?)\b/i);
	if (numericMatch?.[1]) {
		return numericMatch[1];
	}
	const namedCoreMap: Record<string, string> = {
		single: "1",
		dual: "2",
		quad: "4",
		hexa: "6",
		octa: "8",
		deca: "10",
		dodeca: "12",
	};
	for (const [token, value] of Object.entries(namedCoreMap)) {
		if (new RegExp(`\\b${token}\\s*core\\b`, "i").test(text)) {
			return value;
		}
	}
	return null;
}

export function parseCpuSpecsFromTitle(title: string): Record<string, string> {
	const specs: Record<string, string> = {};
	const normalized = title.replace(/\s+/g, " ").trim();

	const modelName = extractCpuModelName(normalized);
	if (modelName) {
		specs.model_name = modelName;
	}

	const socket = detectSocketFromText(normalized);
	if (socket) {
		specs.socket = socket;
	}

	const clockMatches = Array.from(normalized.matchAll(/(\d+(?:[.,]\d+)?)\s*GHz/gi)).map(
		(match) => match[1]?.replace(",", ".") || "",
	);
	if (clockMatches[0]) {
		specs.base_clock_ghz = clockMatches[0];
	}
	if (clockMatches[1]) {
		specs.turbo_clock_ghz = clockMatches[1];
	}

	const cacheMatch = normalized.match(/\bcache\s*([\d.,]+\s*(?:mb|kb))\b/i);
	if (cacheMatch?.[1]) {
		specs.cache = cacheMatch[1].toUpperCase();
	}

	const cores = extractCpuCores(normalized);
	if (cores) {
		specs.cores = cores;
	}

	const threadsMatch = normalized.match(/\b(\d+)\s*threads?\b/i);
	if (threadsMatch?.[1]) {
		specs.threads = threadsMatch[1];
	}

	const skuMatch = normalized.match(/-\s*([A-Z0-9-]{6,})\s*$/i);
	if (skuMatch?.[1]) {
		specs.sku = skuMatch[1].toUpperCase();
	}

	return specs;
}

export function parseJsonObject(value: string | null): Record<string, unknown> | null {
	if (!value) {
		return null;
	}
	try {
		const parsed = JSON.parse(value);
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

export function toInt(value: unknown, fallback: number): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === "string") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return fallback;
}

export async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	operation: string,
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`Operation timed out after ${timeoutMs}ms: ${operation}`));
		}, timeoutMs);
	});

	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	}
}
