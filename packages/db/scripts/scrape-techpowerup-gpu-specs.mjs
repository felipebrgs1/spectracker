import path from "node:path";
import dotenv from "dotenv";

const BASE_URL = "https://www.techpowerup.com";
const LISTING_URL = `${BASE_URL}/gpu-specs/`;

const USER_AGENTS = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
];

const SPEC_KEY_ALIASES = [
	{ key: "gpu_name", patterns: [/^gpu\s*name$/i, /^chip\s*name$/i, /^graphics\s*processor$/i] },
	{ key: "gpu_variant", patterns: [/^gpu\s*variant$/i, /^device\s*id$/i] },
	{ key: "architecture", patterns: [/^architecture$/i] },
	{ key: "foundry", patterns: [/^foundry$/i, /^process\s*size$/i] },
	{ key: "process_size", patterns: [/^process\s*size$/i] },
	{ key: "transistors", patterns: [/^transistors$/i] },
	{ key: "die_size", patterns: [/^die\s*size$/i] },
	{ key: "release_date", patterns: [/^release\s*date$/i] },
	{ key: "bus_interface", patterns: [/^bus\s*interface$/i] },
	{ key: "base_clock", patterns: [/^base\s*clock$/i, /^gpu\s*clock$/i] },
	{ key: "boost_clock", patterns: [/^boost\s*clock$/i] },
	{ key: "memory_clock", patterns: [/^memory\s*clock$/i] },
	{ key: "memory_size", patterns: [/^memory\s*size$/i] },
	{ key: "memory_type", patterns: [/^memory\s*type$/i] },
	{ key: "memory_bus", patterns: [/^memory\s*bus$/i, /^bus\s*width$/i] },
	{ key: "bandwidth", patterns: [/^bandwidth$/i, /^memory\s*bandwidth$/i] },
	{ key: "shading_units", patterns: [/^shading\s*units$/i, /^cuda\s*cores$/i, /^stream\s*processors$/i] },
	{ key: "tmus", patterns: [/^tmus$/i] },
	{ key: "rops", patterns: [/^rops$/i] },
	{ key: "rt_cores", patterns: [/^rt\s*cores$/i] },
	{ key: "tensor_cores", patterns: [/^tensor\s*cores$/i] },
	{ key: "tgp", patterns: [/^tgp$/i, /^tdp$/i, /^board\s*power$/i, /^typical\s*board\s*power$/i] },
	{ key: "outputs", patterns: [/^outputs$/i] },
	{ key: "power_connectors", patterns: [/^power\s*connectors?$/i] },
	{ key: "slot_width", patterns: [/^slot\s*width$/i] },
	{ key: "length", patterns: [/^length$/i] },
	{ key: "directx", patterns: [/^directx$/i] },
	{ key: "opengl", patterns: [/^opengl$/i] },
	{ key: "vulkan", patterns: [/^vulkan$/i] },
	{ key: "shader_model", patterns: [/^shader\s*model$/i] },
	{ key: "opencl", patterns: [/^opencl$/i] },
];

function log(message) {
	console.log(`[${new Date().toISOString()}] ${message}`);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomUserAgent() {
	return USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)];
}

function hashString(value) {
	let hash = 5381;
	for (let index = 0; index < value.length; index += 1) {
		hash = (hash * 33) ^ value.charCodeAt(index);
	}
	return Math.abs(hash >>> 0).toString(36);
}

function stripTags(value) {
	return value
		.replace(/<br\s*\/?\s*>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

function htmlToText(html) {
	return stripTags(html)
		.replace(/\r/g, "\n")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{2,}/g, "\n");
}

function toAbsoluteUrl(href) {
	try {
		return new URL(href, BASE_URL).toString();
	} catch {
		return null;
	}
}

function normalizeModelQuery(value) {
	return value
		.toLowerCase()
		.replace(/\s+/g, "")
		.replace(/[^a-z0-9]/g, "");
}

function isConsumerTargetFromUrl(url) {
	const normalized = (url || "").toLowerCase();
	const isNvidia = /rtx-(3|4|5)\d{3}(?:-|\.|$)/i.test(normalized);
	const isAmd = /rx-(6|7|9)\d{3}(?:-|\.|$)/i.test(normalized);
	const isIntel = /intel-(?:arc|xe)|\/(?:arc|xe)-/i.test(normalized);
	const excluded = /quadro|rtx-a\d{3,4}|radeon-pro|pro-w\d{3,4}|tesla|instinct|\bmi\d{2,3}\b|workstation|data-center/i.test(
		normalized,
	);
	return (isNvidia || isAmd || isIntel) && !excluded;
}

function isConsumerTargetFromText(value) {
	const normalized = (value || "").toLowerCase();
	const isNvidia = /\brtx[\s-]?(3|4|5)\d{3}\b/i.test(normalized);
	const isAmd = /\brx[\s-]?(6|7|9)\d{3}\b/i.test(normalized);
	const isIntel = /\bintel\b/i.test(normalized) && (/\barc\b/i.test(normalized) || /\bxe\b/i.test(normalized));
	const excluded = /\bquadro\b|\brtx\s*a\d{3,4}\b|\bradeon\s*pro\b|\bpro\s*w\d{3,4}\b|\btesla\b|\binstinct\b|\bmi\d{2,3}\b|\bdata\s*center\b|\bworkstation\b/i.test(
		normalized,
	);
	return (isNvidia || isAmd || isIntel) && !excluded;
}

function normalizeSpecKey(value) {
	for (const alias of SPEC_KEY_ALIASES) {
		if (alias.patterns.some((pattern) => pattern.test(value))) {
			return alias.key;
		}
	}

	return value
		.toLowerCase()
		.replace(/\(.*?\)/g, "")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function parseArgs(argv) {
	const options = {
		models: [],
		limit: 80,
		maxPages: 80,
		retryFailed: false,
		discoverOnly: false,
		processOnly: false,
	};

	for (let index = 2; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--models") {
			const value = argv[index + 1] || "";
			options.models = value.split(",").map((v) => v.trim()).filter(Boolean);
			index += 1;
			continue;
		}
		if (arg === "--limit") {
			const parsed = Number.parseInt(argv[index + 1], 10);
			if (Number.isFinite(parsed) && parsed > 0) {
				options.limit = parsed;
			}
			index += 1;
			continue;
		}
		if (arg === "--max-pages") {
			const parsed = Number.parseInt(argv[index + 1], 10);
			if (Number.isFinite(parsed) && parsed > 0) {
				options.maxPages = parsed;
			}
			index += 1;
			continue;
		}
		if (arg === "--retry-failed") {
			options.retryFailed = true;
			continue;
		}
		if (arg === "--discover-only") {
			options.discoverOnly = true;
			continue;
		}
		if (arg === "--process-only") {
			options.processOnly = true;
			continue;
		}
	}

	return options;
}

function shouldKeepByModel(urlOrName, filters) {
	if (!filters.length) {
		return true;
	}
	const haystack = normalizeModelQuery(urlOrName || "");
	return filters.some((filter) => haystack.includes(normalizeModelQuery(filter)));
}

async function fetchHtmlWithRetries(url, maxRetries = 4) {
	let lastError = null;

	for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
		try {
			await sleep(randomInt(300, 1000));
			const response = await fetch(url, {
				headers: {
					"User-Agent": randomUserAgent(),
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
					Referer: LISTING_URL,
				},
				signal: AbortSignal.timeout(25000 + attempt * 3000),
			});

			if (response.status === 429 || response.status >= 500) {
				throw new Error(`HTTP ${response.status}`);
			}
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			return await response.text();
		} catch (error) {
			lastError = error;
			if (attempt < maxRetries) {
				const backoffMs = 700 * 2 ** (attempt - 1) + randomInt(100, 800);
				log(`retry ${attempt}/${maxRetries} for ${url} in ${backoffMs}ms (${String(error)})`);
				await sleep(backoffMs);
			}
		}
	}

	throw new Error(`fetch failed ${url}: ${String(lastError)}`);
}

function parseGpuLinks(html) {
	const urls = new Set();
	for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
		const href = match[1];
		if (!href) {
			continue;
		}
		const absolute = toAbsoluteUrl(href);
		if (!absolute) {
			continue;
		}
		if (/\/gpu-specs\/[a-z0-9-]+\.c\d+\/?$/i.test(absolute)) {
			urls.add(absolute.replace(/\/$/, ""));
		}
	}
	return [...urls];
}

function parseListingPages(html) {
	const urls = new Set();
	for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
		const href = match[1];
		if (!href || !/gpu-specs/i.test(href)) {
			continue;
		}
		if (!/[?&](page|pg)=\d+/i.test(href)) {
			continue;
		}
		const absolute = toAbsoluteUrl(href);
		if (absolute) {
			urls.add(absolute);
		}
	}
	return [...urls];
}

function parseGpuIdFromUrl(url) {
	const match = url.match(/\.c(\d+)\/?$/i);
	return match?.[1] || null;
}

function parseTitle(html) {
	const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
	if (h1Match?.[1]) {
		return stripTags(h1Match[1]);
	}
	const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (titleMatch?.[1]) {
		return stripTags(titleMatch[1]).replace(/\s*[-|].*$/, "").trim();
	}
	return null;
}

function parseOgImage(html) {
	const match = html.match(
		/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
	);
	return match?.[1] ? stripTags(match[1]) : null;
}

function extractTableRows(html) {
	const rows = [];
	for (const trMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
		const tr = trMatch[1] || "";
		const cells = [];
		for (const cellMatch of tr.matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi)) {
			cells.push(stripTags(cellMatch[2] || ""));
		}
		if (cells.length >= 2 && cells[0] && cells[1]) {
			rows.push(cells);
		}
	}
	return rows;
}

function parseSpecs(html) {
	const rawSpecs = {};
	const normalizedSpecs = {};

	for (const cells of extractTableRows(html)) {
		const key = (cells[0] || "").trim();
		const value = cells.slice(1).join(" | ").trim();
		if (!key || !value) {
			continue;
		}
		rawSpecs[key] = value;
		const normalizedKey = normalizeSpecKey(key);
		if (normalizedKey) {
			normalizedSpecs[normalizedKey] = normalizedSpecs[normalizedKey]
				? `${normalizedSpecs[normalizedKey]} | ${value}`
				: value;
		}
	}

	const fullText = htmlToText(html);
	const capture = (pattern) => {
		const match = fullText.match(pattern);
		return match?.[1]?.trim();
	};
	const setMissing = (key, value) => {
		if (!value || normalizedSpecs[key]) {
			return;
		}
		normalizedSpecs[key] = value;
	};

	setMissing("gpu_name", capture(/GPU Name\s+([A-Z0-9._-]+)/i));
	setMissing("architecture", capture(/Architecture\s+([^\n]+)/i));
	setMissing("release_date", capture(/Release Date\s+([A-Za-z]{3,10}\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4})/i));
	setMissing("bus_interface", capture(/Bus Interface\s+([^\n]+)/i));
	setMissing("base_clock", capture(/Base Clock\s+([0-9.]+\s*MHz)/i));
	setMissing("boost_clock", capture(/Boost Clock\s+([0-9.]+\s*MHz)/i));
	setMissing("memory_clock", capture(/Memory Clock\s+([0-9.]+\s*MHz(?:\s*\|\s*[0-9.]+\s*Gbps[^ \n]*)?)/i));
	setMissing("memory_size", capture(/Memory Size\s+([0-9.]+\s*GB)/i));
	setMissing("memory_type", capture(/Memory Type\s+((?:GDDR\dX?|HBM\dE?)[^\n]*)/i));
	setMissing("memory_bus", capture(/Memory Bus\s+([0-9.]+\s*-?\s*bit)/i));
	setMissing("bandwidth", capture(/Bandwidth\s+([0-9.]+\s*GB\/s)/i));
	setMissing("tgp", capture(/(?:TGP|TDP|Board Power)\s+([0-9.]+\s*W)/i));
	setMissing("shading_units", capture(/Shading Units\s+([0-9,]+)/i));
	setMissing("tmus", capture(/TMUs\s+([0-9,]+)/i));
	setMissing("rops", capture(/ROPs\s+([0-9,]+)/i));
	setMissing("rt_cores", capture(/RT Cores\s+([0-9,]+)/i));
	setMissing("tensor_cores", capture(/Tensor Cores\s+([0-9,]+)/i));

	return { rawSpecs, normalizedSpecs };
}

async function initDb() {
	dotenv.config({ path: path.resolve(process.cwd(), ".env") });
	if (!process.env.DATABASE_URL) {
		dotenv.config({ path: path.resolve(process.cwd(), "../../.env"), override: false });
	}

	const databaseUrl = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || "";
	const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.NUXT_DATABASE_AUTH_TOKEN;

	if (!databaseUrl) {
		throw new Error("DATABASE_URL not found in .env");
	}

	const { createClient } = await import("@libsql/client");
	const client = createClient({ url: databaseUrl, authToken });
	await client.execute("SELECT 1");
	return client;
}

async function enqueueGpuUrls(client, urls) {
	const now = new Date().toISOString();
	let insertedOrUpdated = 0;

	for (const url of urls) {
		const gpuId = parseGpuIdFromUrl(url);
		const id = `tpuq-${gpuId || hashString(url)}`;

		await client.execute({
			sql: `
				INSERT INTO techpowerup_gpu_specs_queue (
					id, url, external_gpu_id, status, attempt_count, created_at, updated_at
				) VALUES (?, ?, ?, 'pending', 0, ?, ?)
				ON CONFLICT(url) DO UPDATE SET
					external_gpu_id = COALESCE(excluded.external_gpu_id, techpowerup_gpu_specs_queue.external_gpu_id),
					updated_at = excluded.updated_at
			`,
			args: [id, url, gpuId, now, now],
		});

		insertedOrUpdated += 1;
	}

	return insertedOrUpdated;
}

async function discoverConsumerGpuUrls(options) {
	const visited = new Set();
	const queue = [LISTING_URL];
	const gpuUrls = new Set();

	while (queue.length > 0 && visited.size < options.maxPages) {
		const pageUrl = queue.shift();
		if (!pageUrl || visited.has(pageUrl)) {
			continue;
		}
		visited.add(pageUrl);
		log(`listing fetch: ${pageUrl}`);

		const html = await fetchHtmlWithRetries(pageUrl, 3);
		for (const gpuUrl of parseGpuLinks(html)) {
			if (!isConsumerTargetFromUrl(gpuUrl)) {
				continue;
			}
			if (!shouldKeepByModel(gpuUrl, options.models)) {
				continue;
			}
			gpuUrls.add(gpuUrl);
		}

		for (const listingUrl of parseListingPages(html)) {
			if (!visited.has(listingUrl)) {
				queue.push(listingUrl);
			}
		}
	}

	return [...gpuUrls].sort((a, b) => a.localeCompare(b));
}

async function loadQueueBatch(client, options) {
	const statuses = options.retryFailed ? ["pending", "failed"] : ["pending"];
	const placeholders = statuses.map(() => "?").join(", ");
	const result = await client.execute({
		sql: `
			SELECT id, url, external_gpu_id, gpu_name, status, attempt_count
			FROM techpowerup_gpu_specs_queue
			WHERE status IN (${placeholders})
			ORDER BY updated_at ASC
			LIMIT ?
		`,
		args: [...statuses, options.limit],
	});

	return result.rows.map((row) => ({
		id: String(row.id),
		url: String(row.url),
		externalGpuId: row.external_gpu_id ? String(row.external_gpu_id) : null,
		gpuName: row.gpu_name ? String(row.gpu_name) : null,
		status: String(row.status),
		attemptCount: Number(row.attempt_count || 0),
	}));
}

async function markSuccess(client, rowId, payload, gpuName) {
	const now = new Date().toISOString();
	await client.execute({
		sql: `
			UPDATE techpowerup_gpu_specs_queue
			SET
				status = 'success',
				attempt_count = attempt_count + 1,
				last_error = NULL,
				last_attempt_at = ?,
				completed_at = ?,
				gpu_name = ?,
				payload_json = ?,
				updated_at = ?
			WHERE id = ?
		`,
		args: [now, now, gpuName || null, JSON.stringify(payload), now, rowId],
	});
}

async function markSkipped(client, rowId, gpuName, payload) {
	const now = new Date().toISOString();
	await client.execute({
		sql: `
			UPDATE techpowerup_gpu_specs_queue
			SET
				status = 'skipped',
				attempt_count = attempt_count + 1,
				last_error = NULL,
				last_attempt_at = ?,
				completed_at = ?,
				gpu_name = ?,
				payload_json = ?,
				updated_at = ?
			WHERE id = ?
		`,
		args: [now, now, gpuName || null, JSON.stringify(payload), now, rowId],
	});
}

async function markFailed(client, rowId, errorText) {
	const now = new Date().toISOString();
	await client.execute({
		sql: `
			UPDATE techpowerup_gpu_specs_queue
			SET
				status = 'failed',
				attempt_count = attempt_count + 1,
				last_error = ?,
				last_attempt_at = ?,
				updated_at = ?
			WHERE id = ?
		`,
		args: [errorText.slice(0, 2000), now, now, rowId],
	});
}

function buildPayload(url, title, html, normalizedSpecs, rawSpecs) {
	const usefulSpecs = {};
	for (const key of [
		"architecture",
		"release_date",
		"base_clock",
		"boost_clock",
		"memory_size",
		"memory_type",
		"memory_clock",
		"memory_bus",
		"bandwidth",
		"tgp",
		"shading_units",
		"tmus",
		"rops",
		"rt_cores",
		"tensor_cores",
		"bus_interface",
	]) {
		if (normalizedSpecs[key]) {
			usefulSpecs[key] = normalizedSpecs[key];
		}
	}

	return {
		source: "techpowerup",
		url,
		name: title,
		imageUrl: parseOgImage(html),
		scrapedAt: new Date().toISOString(),
		specs: usefulSpecs,
		allSpecs: normalizedSpecs,
		rawSpecs,
	};
}

async function processQueue(client, options) {
	const rows = await loadQueueBatch(client, options);
	log(`processing ${rows.length} rows from queue`);

	let successCount = 0;
	let failedCount = 0;
	let skippedCount = 0;

	for (let index = 0; index < rows.length; index += 1) {
		const row = rows[index];
		log(`gpu fetch (${index + 1}/${rows.length}): ${row.url}`);

		try {
			const html = await fetchHtmlWithRetries(row.url, 4);
			const title = parseTitle(html) || row.gpuName || row.url;
			const { rawSpecs, normalizedSpecs } = parseSpecs(html);
			const candidateName = title || normalizedSpecs.gpu_name || rawSpecs["Graphics Processor"] || "";

			if (!isConsumerTargetFromText(candidateName)) {
				await markSkipped(client, row.id, title, {
					reason: "non-consumer-or-not-target-series",
					name: title,
					url: row.url,
					scrapedAt: new Date().toISOString(),
				});
				skippedCount += 1;
				continue;
			}

			const payload = buildPayload(row.url, title, html, normalizedSpecs, rawSpecs);
			await markSuccess(client, row.id, payload, title);
			successCount += 1;
		} catch (error) {
			await markFailed(client, row.id, String(error));
			failedCount += 1;
		}

		await sleep(randomInt(450, 1300));
	}

	log(`queue processing done: success=${successCount}, failed=${failedCount}, skipped=${skippedCount}`);
}

async function printQueueSummary(client) {
	const result = await client.execute(`
		SELECT status, COUNT(*) as total
		FROM techpowerup_gpu_specs_queue
		GROUP BY status
		ORDER BY status
	`);

	const summary = {};
	for (const row of result.rows) {
		summary[String(row.status)] = Number(row.total || 0);
	}
	log(`queue summary: ${JSON.stringify(summary)}`);
}

async function main() {
	const options = parseArgs(process.argv);
	const client = await initDb();

	if (!options.processOnly) {
		log("starting discovery");
		const urls = await discoverConsumerGpuUrls(options);
		log(`discovered ${urls.length} target consumer GPU urls`);
		const totalUpserted = await enqueueGpuUrls(client, urls);
		log(`queue upsert complete (${totalUpserted})`);
	}

	if (!options.discoverOnly) {
		await processQueue(client, options);
	}

	await printQueueSummary(client);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
