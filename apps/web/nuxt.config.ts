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
		databaseUrl: "",
		databaseAuthToken: "",
	},
	nitro: {
		preset: process.env.NITRO_PRESET || "cloudflare_module",
		cloudflare: {
			deployConfig: true,
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
