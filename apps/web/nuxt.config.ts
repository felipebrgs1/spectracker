import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import tailwindcss from "@tailwindcss/vite";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../.env") });

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "latest",
	devtools: { enabled: true },
	modules: ["shadcn-nuxt", "@nuxtjs/color-mode"],
	colorMode: {
		classSuffix: "",
	},
	css: ["~/assets/css/main.css"],
	devServer: {
		port: 5173,
	},
	shadcn: {
		prefix: "",
		componentDir: "./app/components/ui",
	},
	runtimeConfig: {},
	vite: {
		build: {
			sourcemap: false,
		},
		plugins: [tailwindcss() as any],
	},
});
