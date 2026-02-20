import { defineConfig } from "drizzle-kit";

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 1) {
	const key = process.argv[index];
	const value = process.argv[index + 1];
	if (key?.startsWith("--")) {
		args.set(key, value ?? "");
		index += 1;
	}
}

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "turso",
	dbCredentials: {
		url: args.get("--database-url") || "",
		authToken: args.get("--auth-token"),
	},
});
