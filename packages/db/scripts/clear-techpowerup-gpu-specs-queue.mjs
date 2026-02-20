async function main() {
	const args = new Map();
	for (let index = 2; index < process.argv.length; index += 1) {
		const key = process.argv[index];
		const value = process.argv[index + 1];
		if (key?.startsWith("--")) {
			args.set(key, value ?? "");
			index += 1;
		}
	}

	const databaseUrl = args.get("--database-url") || "";
	const authToken = args.get("--auth-token") || undefined;

	if (!databaseUrl) {
		throw new Error("Missing --database-url.");
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
