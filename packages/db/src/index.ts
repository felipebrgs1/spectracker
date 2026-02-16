import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema/index";

const databaseUrl = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || "";
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN || process.env.NUXT_DATABASE_AUTH_TOKEN;

const client = createClient({
	url: databaseUrl,
	authToken: databaseAuthToken,
});

export const db = drizzle({ client, schema });
export * from "./schema/index";
