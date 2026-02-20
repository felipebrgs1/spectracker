import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema/index";

type DbCredentials = {
	url: string;
	authToken?: string;
};

type DbEnv = {
	DATABASE_URL?: string;
	DATABASE_AUTH_TOKEN?: string;
	NUXT_DATABASE_URL?: string;
	NUXT_DATABASE_AUTH_TOKEN?: string;
};

function resolveCredentials(env: DbEnv): DbCredentials {
	const url = env.DATABASE_URL || env.NUXT_DATABASE_URL || "";
	const authToken = env.DATABASE_AUTH_TOKEN || env.NUXT_DATABASE_AUTH_TOKEN;
	return { url, authToken };
}

export function createDb({ url, authToken }: DbCredentials) {
	const client = createClient({
		url,
		authToken,
	});

	return drizzle({ client, schema });
}

function readProcessEnv(): DbEnv {
	if (typeof process === "undefined" || !process.env) {
		return {};
	}
	return process.env as DbEnv;
}

export function createDbFromEnv(env: DbEnv = readProcessEnv()) {
	return createDb(resolveCredentials(env));
}

export const db = createDbFromEnv();
export * from "./schema/index";
