import path from "node:path";
import dotenv from "dotenv";

async function main() {
	dotenv.config({ path: path.resolve(process.cwd(), ".env") });
	if (!process.env.DATABASE_URL) {
		dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), override: false });
	}

	const databaseUrl = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || "";
	const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.NUXT_DATABASE_AUTH_TOKEN;

	if (!databaseUrl) {
		throw new Error("DATABASE_URL not found in .env");
	}

	const { createClient } = await import("@libsql/client");
	const client = createClient({ url: databaseUrl, authToken });

	const before = await client.execute("SELECT COUNT(*) as total FROM techpowerup_gpu_specs_queue");
	await client.execute("DELETE FROM techpowerup_gpu_specs_queue");
	const after = await client.execute("SELECT COUNT(*) as total FROM techpowerup_gpu_specs_queue");

	const beforeTotal = Number(before.rows?.[0]?.total ?? 0);
	const afterTotal = Number(after.rows?.[0]?.total ?? 0);
	console.log(`queue limpa: ${beforeTotal} -> ${afterTotal}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
