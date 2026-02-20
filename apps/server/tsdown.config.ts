import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	inlineOnly: false,
	noExternal: [/@spectracker\/.*/],
	external: ["libsql", "@libsql/client", /@libsql\/.*/],
});
