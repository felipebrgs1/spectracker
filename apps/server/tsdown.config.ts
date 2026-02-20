import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	noExternal: [/@spectracker\/.*/],
	external: ["libsql", "@libsql/client", /@libsql\/.*/],
});
