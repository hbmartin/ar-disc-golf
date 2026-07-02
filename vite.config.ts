import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		svelte(),
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				name: "AR Disc Golf",
				short_name: "AR Disc Golf",
				description:
					"Play disc golf with GPS course maps, scorekeeping, and AR guidance to the basket.",
				theme_color: "#667eea",
				background_color: "#242424",
				display: "standalone",
				orientation: "portrait",
				icons: [
					{ src: "pwa-192.png", sizes: "192x192", type: "image/png" },
					{ src: "pwa-512.png", sizes: "512x512", type: "image/png" },
					{
						src: "pwa-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
				// The AR bundle is large; raise the precache single-file limit
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
				runtimeCaching: [
					{
						// Courses often have poor connectivity — serve map tiles and
						// styles from cache first so previously viewed areas work offline
						urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/,
						handler: "CacheFirst",
						options: {
							cacheName: "map-tiles",
							expiration: {
								maxEntries: 2000,
								maxAgeSeconds: 30 * 24 * 60 * 60,
							},
							cacheableResponse: { statuses: [0, 200] },
						},
					},
				],
			},
		}),
	],
	server: {
		host: "0.0.0.0",
		port: 54702,
		allowedHosts: true,
		headers: {
			"Cross-Origin-Embedder-Policy": "cross-origin",
			"Cross-Origin-Opener-Policy": "same-origin",
		},
	},
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: ["src/test-setup.ts"],
	},
});
