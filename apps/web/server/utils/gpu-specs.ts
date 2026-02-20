type JsonObject = Record<string, unknown>;

function toStringMap(value: unknown): Record<string, string> {
	if (!value || typeof value !== "object") {
		return {};
	}

	const out: Record<string, string> = {};
	for (const [key, rawValue] of Object.entries(value as JsonObject)) {
		if (typeof rawValue === "string" && rawValue.trim().length > 0) {
			out[key] = rawValue.trim();
		}
	}
	return out;
}

function normalizeLooseKey(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function lookupValueFromMaps(
	maps: Record<string, string>[],
	aliases: string[],
): string | undefined {
	const normalizedAliases = aliases.map((alias) => normalizeLooseKey(alias));

	for (const map of maps) {
		for (const [key, value] of Object.entries(map)) {
			if (!value) {
				continue;
			}
			const normalizedKey = normalizeLooseKey(key);
			if (normalizedAliases.includes(normalizedKey)) {
				return value;
			}
		}
	}

	return undefined;
}

function parseClocksFromCombinedRows(maps: Record<string, string>[]): {
	baseClock?: string;
	boostClock?: string;
	memoryClock?: string;
} {
	const allValues: string[] = [];
	for (const map of maps) {
		allValues.push(...Object.values(map));
	}

	for (const value of allValues) {
		const match = value.match(
			/([^|]*\bMHz\b[^|]*)\s*\|\s*([^|]*\bMHz\b[^|]*)\s*\|\s*([^|]*\bMHz\b[^|]*)/i,
		);
		if (match) {
			return {
				baseClock: match[1]?.trim(),
				boostClock: match[2]?.trim(),
				memoryClock: match[3]?.trim(),
			};
		}
	}

	return {};
}

function parseMemorySizeFromName(name: string): string | undefined {
	const match = name.match(/\b(\d+)\s*GB\b/i);
	return match?.[0]?.toUpperCase();
}

function findFirstMatch(values: string[], pattern: RegExp): string | undefined {
	for (const value of values) {
		const match = value.match(pattern);
		if (match?.[0]) {
			return match[0].trim();
		}
	}
	return undefined;
}

function inferArchitectureFromName(name: string): string | undefined {
	const normalized = name.toLowerCase();
	if (/\brtx\s*50\d{2}\b/.test(normalized)) {
		return "Blackwell";
	}
	if (/\brtx\s*40\d{2}\b/.test(normalized)) {
		return "Ada Lovelace";
	}
	if (/\brtx\s*30\d{2}\b/.test(normalized)) {
		return "Ampere";
	}
	if (/\brx\s*9\d{3}\b/.test(normalized)) {
		return "RDNA 4";
	}
	if (/\brx\s*7\d{3}\b/.test(normalized)) {
		return "RDNA 3";
	}
	if (/\brx\s*6\d{3}\b/.test(normalized)) {
		return "RDNA 2";
	}
	if (/\barc\b|\bintel\b.*\bxe\b|\bxe\b.*\bintel\b/.test(normalized)) {
		return "Xe";
	}
	return undefined;
}

export function pickCleanSpecsFromPayload(
	payload: JsonObject | null,
	name: string | null,
): Record<string, string> {
	const specsMap = toStringMap(payload?.specs);
	const allSpecsMap = toStringMap(payload?.allSpecs);
	const rawSpecsMap = toStringMap(payload?.rawSpecs);

	const maps = [specsMap, allSpecsMap, rawSpecsMap];
	const allValues = maps.flatMap((map) => Object.values(map));

	const clocksFromCombined = parseClocksFromCombinedRows(maps);

	const specs: Record<string, string> = {};
	const architecture = lookupValueFromMaps(maps, ["architecture", "uarch"]);
	if (architecture) {
		specs.architecture = architecture;
	} else if (name) {
		const inferredArchitecture = inferArchitectureFromName(name);
		if (inferredArchitecture) {
			specs.architecture = inferredArchitecture;
		}
	}

	const releaseDate = lookupValueFromMaps(maps, [
		"release_date",
		"release date",
		"launch date",
		"date",
	]);
	if (releaseDate) {
		specs.release_date = releaseDate;
	}

	const busInterface = lookupValueFromMaps(maps, [
		"bus_interface",
		"bus interface",
		"interface",
		"pcie",
	]);
	if (busInterface) {
		specs.bus_interface = busInterface;
	}

	const baseClock =
		lookupValueFromMaps(maps, ["base_clock", "base clock", "gpu_clock", "gpu clock"]) ||
		clocksFromCombined.baseClock;
	if (baseClock) {
		specs.base_clock = baseClock;
	}

	const boostClock =
		lookupValueFromMaps(maps, ["boost_clock", "boost clock"]) || clocksFromCombined.boostClock;
	if (boostClock) {
		specs.boost_clock = boostClock;
	}

	const memorySize =
		lookupValueFromMaps(maps, ["memory_size", "memory size", "vram"]) ||
		findFirstMatch(allValues, /\b\d+\s*GB\b/i) ||
		(name ? parseMemorySizeFromName(name) : undefined);
	if (memorySize) {
		specs.memory_size = memorySize.toUpperCase();
	}

	const memoryType =
		lookupValueFromMaps(maps, ["memory_type", "memory type", "memory"]) ||
		findFirstMatch(allValues, /\b(?:GDDR\dX?|HBM\dE?)\b/i);
	if (memoryType) {
		specs.memory_type = memoryType.toUpperCase();
	}

	const memoryClock =
		lookupValueFromMaps(maps, ["memory_clock", "memory clock"]) || clocksFromCombined.memoryClock;
	if (memoryClock) {
		specs.memory_clock = memoryClock;
	}

	const memoryBus =
		lookupValueFromMaps(maps, ["memory_bus", "memory bus", "bus_width", "bus width"]) ||
		findFirstMatch(allValues, /\b\d{2,4}\s*-?\s*bit\b/i);
	if (memoryBus) {
		specs.memory_bus = memoryBus.replace(/\s+/g, " ");
	}

	const bandwidth =
		lookupValueFromMaps(maps, ["bandwidth", "memory_bandwidth", "memory bandwidth"]) ||
		findFirstMatch(allValues, /\b\d+(?:\.\d+)?\s*GB\/s\b/i);
	if (bandwidth) {
		specs.bandwidth = bandwidth.toUpperCase();
	}

	const tgp =
		lookupValueFromMaps(maps, ["tgp", "tdp", "board power", "typical board power"]) ||
		findFirstMatch(allValues, /\b\d{2,4}\s*W\b/i);
	if (tgp) {
		specs.tgp = tgp.toUpperCase();
	}

	return specs;
}
