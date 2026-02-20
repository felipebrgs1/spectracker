import { createD1Db } from "@spectracker/db";

type D1DatabaseLike = Parameters<typeof createD1Db>[0];

const cache = new WeakMap<object, ReturnType<typeof createD1Db>>();

export function getDb(d1: D1DatabaseLike) {
	const key = d1 as object;
	const existing = cache.get(key);
	if (existing) {
		return existing;
	}

	const database = createD1Db(d1);
	cache.set(key, database);
	return database;
}
