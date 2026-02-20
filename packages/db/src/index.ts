import { createClient } from "@libsql/client";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema/index";

type DbCredentials = {
	url: string;
	authToken?: string;
};

type D1DatabaseLike = {
	prepare: (query: string) => unknown;
};

export function createDb({ url, authToken }: DbCredentials) {
	const client = createClient({
		url,
		authToken,
	});

	return drizzle({ client, schema });
}

export function createD1Db(client: D1DatabaseLike) {
	return drizzleD1(client as any, { schema });
}
export * from "./schema/index";
