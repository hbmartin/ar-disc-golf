import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

const distDir = path.resolve("dist");
const assetsDir = path.join(distDir, "assets");
const reportPath = path.join(distDir, "bundle-report.html");

const formatBytes = (bytes) => {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const escapeHtml = (value) =>
	String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

const packageNameForSource = (source) => {
	const nodeModulesIndex = source.lastIndexOf("/node_modules/");
	if (nodeModulesIndex === -1) {
		return source.includes("/src/") || source.startsWith("../src/")
			? "src"
			: "other";
	}

	const packagePath = source.slice(nodeModulesIndex + "/node_modules/".length);
	const [first, second] = packagePath.split("/");
	return first.startsWith("@") ? `${first}/${second}` : first;
};

const assetFiles = await readdir(assetsDir);
const builtAssets = await Promise.all(
	assetFiles
		.filter((file) => /\.(js|css)$/.test(file))
		.map(async (file) => {
			const absolutePath = path.join(assetsDir, file);
			const contents = await readFile(absolutePath);
			const stats = await stat(absolutePath);
			return {
				file,
				bytes: stats.size,
				gzipBytes: gzipSync(contents).length,
				type: file.endsWith(".css") ? "css" : "js",
			};
		}),
);

builtAssets.sort((a, b) => b.bytes - a.bytes);

const sourceGroups = new Map();
for (const file of assetFiles.filter((asset) => asset.endsWith(".js.map"))) {
	const map = JSON.parse(await readFile(path.join(assetsDir, file), "utf8"));
	const sources = Array.isArray(map.sources) ? map.sources : [];
	const sourcesContent = Array.isArray(map.sourcesContent)
		? map.sourcesContent
		: [];

	for (let i = 0; i < sources.length; i += 1) {
		const source = sources[i];
		const contents = sourcesContent[i] ?? "";
		const bytes = Buffer.byteLength(contents);
		if (bytes === 0) continue;

		const packageName = packageNameForSource(source);
		const current = sourceGroups.get(packageName) ?? {
			packageName,
			bytes: 0,
			sources: 0,
		};
		current.bytes += bytes;
		current.sources += 1;
		sourceGroups.set(packageName, current);
	}
}

const groupedSources = Array.from(sourceGroups.values()).sort(
	(a, b) => b.bytes - a.bytes,
);
const maxAssetBytes = Math.max(...builtAssets.map((asset) => asset.bytes), 1);
const maxSourceBytes = Math.max(
	...groupedSources.map((group) => group.bytes),
	1,
);

const assetRows = builtAssets
	.map(
		(asset) => `
			<tr>
				<td><code>${escapeHtml(asset.file)}</code></td>
				<td>${asset.type}</td>
				<td>${formatBytes(asset.bytes)}</td>
				<td>${formatBytes(asset.gzipBytes)}</td>
				<td><div class="bar"><span style="width: ${(asset.bytes / maxAssetBytes) * 100}%"></span></div></td>
			</tr>`,
	)
	.join("");

const sourceRows = groupedSources
	.slice(0, 40)
	.map(
		(group) => `
			<tr>
				<td><code>${escapeHtml(group.packageName)}</code></td>
				<td>${formatBytes(group.bytes)}</td>
				<td>${group.sources}</td>
				<td><div class="bar"><span style="width: ${(group.bytes / maxSourceBytes) * 100}%"></span></div></td>
			</tr>`,
	)
	.join("");

const html = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Bundle Report</title>
		<style>
			:root {
				color-scheme: light;
				font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
				color: #172033;
				background: #f6f7fb;
			}
			body {
				margin: 0;
				padding: 32px;
			}
			main {
				max-width: 1120px;
				margin: 0 auto;
			}
			h1 {
				margin: 0 0 8px;
				font-size: 28px;
			}
			p {
				margin: 0 0 24px;
				color: #5f6b7a;
			}
			section {
				margin-top: 24px;
				background: white;
				border: 1px solid #dde3ee;
				border-radius: 8px;
				overflow: hidden;
			}
			h2 {
				margin: 0;
				padding: 16px 18px;
				font-size: 18px;
				border-bottom: 1px solid #dde3ee;
			}
			table {
				width: 100%;
				border-collapse: collapse;
				font-size: 14px;
			}
			th,
			td {
				padding: 10px 12px;
				text-align: left;
				border-bottom: 1px solid #edf1f7;
				vertical-align: middle;
			}
			th {
				color: #5f6b7a;
				font-size: 12px;
				text-transform: uppercase;
				letter-spacing: 0.04em;
			}
			code {
				font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
				font-size: 12px;
			}
			.bar {
				width: 100%;
				height: 8px;
				background: #edf1f7;
				border-radius: 999px;
				overflow: hidden;
			}
			.bar span {
				display: block;
				height: 100%;
				background: #3478f6;
			}
		</style>
	</head>
	<body>
		<main>
			<h1>Bundle Report</h1>
			<p>Generated from <code>vite build --mode analyze</code>. Source groups use sourcemap source-content bytes, which are directional rather than exact minified output bytes.</p>

			<section>
				<h2>Built Assets</h2>
				<table>
					<thead>
						<tr>
							<th>File</th>
							<th>Type</th>
							<th>Size</th>
							<th>Gzip</th>
							<th>Relative Size</th>
						</tr>
					</thead>
					<tbody>${assetRows}</tbody>
				</table>
			</section>

			<section>
				<h2>Top Source Groups</h2>
				<table>
					<thead>
						<tr>
							<th>Group</th>
							<th>Source Bytes</th>
							<th>Sources</th>
							<th>Relative Size</th>
						</tr>
					</thead>
					<tbody>${sourceRows}</tbody>
				</table>
			</section>
		</main>
	</body>
</html>`;

await writeFile(reportPath, html);
console.log(`Bundle report written to ${reportPath}`);
