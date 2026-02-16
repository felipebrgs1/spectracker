import tailwindcss from "@tailwindcss/vite";
import "@spectracker/env/web";

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
	runtimeConfig: {
		databaseUrl: "",
		databaseAuthToken: "",
	},
	vite: {
		build: {
			sourcemap: false,
		},
		plugins: [tailwindcss() as any],
	},
});
