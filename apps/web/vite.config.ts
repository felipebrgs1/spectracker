import vinext from "vinext";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import AutoImport from "unplugin-auto-import/vite";

export default defineConfig({
	plugins: [
		tailwindcss(),
		AutoImport({
			imports: ["react"],
			dirs: ["./app/components/ui"],
			dts: true,
			eslintrc: {
				enabled: true,
				filepath: "./.oxlintrc-auto-import.json",
			},
		}),
		vinext(),
	],
});
