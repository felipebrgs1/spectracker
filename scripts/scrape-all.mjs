const base = (process.env.INGESTION_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const token = process.env.INGESTION_TOKEN;

const headers = {};
if (token) headers["x-ingestion-token"] = token;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, init = {}, retries = 3) {
	let lastError;
	for (let attempt = 1; attempt <= retries; attempt += 1) {
		try {
			return await fetch(url, {
				...init,
				signal: AbortSignal.timeout(120000),
			});
		} catch (error) {
			lastError = error;
			if (attempt < retries) {
				await sleep(500 * attempt);
			}
		}
	}
	throw lastError;
}

async function main() {
	try {
		const health = await request(`${base}/`, { method: "GET" }, 2);
		if (!health.ok) {
			console.error(`Server respondeu ${health.status} em ${base}/`);
			process.exit(1);
		}
	} catch (error) {
		console.error(`Nao consegui conectar em ${base}. O server esta rodando?`);
		console.error("Dica: rode `pnpm dev:server` em outro terminal.");
		if (error?.cause?.code) {
			console.error(`Causa: ${error.cause.code}`);
		}
		process.exit(1);
	}

	try {
		const response = await request(
			`${base}/internal/ingestion/core/kabum`,
			{ method: "POST", headers },
			2,
		);

		const text = await response.text();
		if (!response.ok) {
			console.error(`Falha no scraping: HTTP ${response.status}`);
			console.error(text);
			process.exit(1);
		}

		console.log(text);
	} catch (error) {
		console.error("Conexao encerrada durante o scraping.");
		console.error("Isso normalmente indica que o server reiniciou ou caiu durante o request.");
		console.error("Confira os logs do terminal do `pnpm dev:server`.");
		if (error?.cause?.code) {
			console.error(`Causa: ${error.cause.code}`);
		}
		process.exit(1);
	}
}

await main();
