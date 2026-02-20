import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2026-02-20",
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
		apiUrl: process.env.NUXT_API_URL || "https://spectracker-api.felipeborgacogame.workers.dev",
	},
	nitro: {
		preset: "cloudflare-pages",
		cloudflare: {
			nodeCompat: true,
		},
	},
	vite: {
		build: {
			sourcemap: false,
		},
		plugins: [tailwindcss() as any],
	},
});
