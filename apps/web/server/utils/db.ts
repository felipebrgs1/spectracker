import { createDb } from "@spectracker/db";

type RuntimeConfigLike = {
	databaseUrl?: string;
	databaseAuthToken?: string;
};

const dbByCredentials = new Map<string, ReturnType<typeof createDb>>();

function envValue(key: string): string | undefined {
	if (typeof process === "undefined" || !process.env) {
		return undefined;
	}
	return process.env[key];
}

export function getDb(runtimeConfig: RuntimeConfigLike) {
	const databaseUrl =
		runtimeConfig.databaseUrl || envValue("NUXT_DATABASE_URL") || envValue("DATABASE_URL") || "";
	const databaseAuthToken =
		runtimeConfig.databaseAuthToken ||
		envValue("NUXT_DATABASE_AUTH_TOKEN") ||
		envValue("DATABASE_AUTH_TOKEN");

	if (!databaseUrl) {
		throw new Error("Missing database URL. Set NUXT_DATABASE_URL (or DATABASE_URL).");
	}

	const cacheKey = `${databaseUrl}|${databaseAuthToken || ""}`;
	const existing = dbByCredentials.get(cacheKey);
	if (existing) {
		return existing;
	}

	const database = createDb({
		url: databaseUrl,
		authToken: databaseAuthToken,
	});
	dbByCredentials.set(cacheKey, database);
	return database;
}
