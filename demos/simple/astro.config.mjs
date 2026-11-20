import node from "@astrojs/node";
import react from "@astrojs/react";
import auditLog from "@emdash-cms/plugin-audit-log";
import { mcpSmokePlugin } from "@emdash-cms/plugin-mcp-smoke";
import { defineConfig, fontProviders } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

export default defineConfig({
	output: "server",
	i18n: {
		defaultLocale: "fa",
		locales: ["fa"],
		routing: { prefixDefaultLocale: false },
	},
	adapter: node({
		mode: "standalone",
	}),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			admin: {
				locale: "fa",
				locales: ["fa"],
				siteName: "ام‌دش فارسی",
				footerLabel: "ام‌دش فارسی",
			},
			fonts: { scripts: ["arabic"] },
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			plugins: [auditLog, mcpSmokePlugin()],
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Vazirmatn",
			cssVariable: "--font-body",
			subsets: ["arabic", "latin"],
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
