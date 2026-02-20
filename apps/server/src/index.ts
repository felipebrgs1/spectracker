import { resolve } from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: resolve(process.cwd(), "../../.env") });

import { cors } from "@elysiajs/cors";
import { createContext } from "@spectracker/api/context";
import { appRouter } from "@spectracker/api/routers/index";
import {
	syncCoreComponentOffersFromKabum,
	syncCpuOffersFromKabum,
	syncGpuOffersFromKabum,
	syncRamOffersFromKabum,
} from "@spectracker/db/ingestion";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Elysia } from "elysia";

import { startIngestionScheduler } from "./jobs/ingestion";

const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});
const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

startIngestionScheduler();

const configuredPort = Number.parseInt(process.env.PORT ?? "", 10);
const port = Number.isFinite(configuredPort) ? configuredPort : 3000;

const app = new Elysia()
	.use(
		cors({
			origin: process.env.CORS_ORIGIN || "http://localhost:5173",
			methods: ["GET", "POST", "OPTIONS"],
		}),
	)
	.all("/rpc*", async (context) => {
		const { response } = await rpcHandler.handle(context.request, {
			prefix: "/rpc",
			context: await createContext({ context }),
		});
		return response ?? new Response("Not Found", { status: 404 });
	})
	.all("/api*", async (context) => {
		const { response } = await apiHandler.handle(context.request, {
			prefix: "/api-reference",
			context: await createContext({ context }),
		});
		return response ?? new Response("Not Found", { status: 404 });
	})
	.post("/internal/ingestion/cpu/kabum", async (context) => {
		const configuredToken = process.env.INGESTION_TOKEN;
		if (configuredToken) {
			const providedToken = context.request.headers.get("x-ingestion-token");
			if (providedToken !== configuredToken) {
				return new Response("Unauthorized", { status: 401 });
			}
		}

		const result = await syncCpuOffersFromKabum();
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	})
	.post("/internal/ingestion/gpu/kabum", async (context) => {
		const configuredToken = process.env.INGESTION_TOKEN;
		if (configuredToken) {
			const providedToken = context.request.headers.get("x-ingestion-token");
			if (providedToken !== configuredToken) {
				return new Response("Unauthorized", { status: 401 });
			}
		}

		const result = await syncGpuOffersFromKabum();
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	})
	.post("/internal/ingestion/ram/kabum", async (context) => {
		const configuredToken = process.env.INGESTION_TOKEN;
		if (configuredToken) {
			const providedToken = context.request.headers.get("x-ingestion-token");
			if (providedToken !== configuredToken) {
				return new Response("Unauthorized", { status: 401 });
			}
		}

		const result = await syncRamOffersFromKabum();
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	})
	.post("/internal/ingestion/core/kabum", async (context) => {
		const configuredToken = process.env.INGESTION_TOKEN;
		if (configuredToken) {
			const providedToken = context.request.headers.get("x-ingestion-token");
			if (providedToken !== configuredToken) {
				return new Response("Unauthorized", { status: 401 });
			}
		}

		const result = await syncCoreComponentOffersFromKabum();
		return new Response(JSON.stringify(result), {
			status: 200,
			headers: {
				"content-type": "application/json",
			},
		});
	})
	.get("/", () => "OK")
;

function isAddressInUseError(error: unknown): boolean {
	return Boolean(
		error &&
			typeof error === "object" &&
			"code" in error &&
			(error as { code?: string }).code === "EADDRINUSE",
	);
}

function resolveListeningPort(server: unknown, fallbackPort: number): number {
	if (
		server &&
		typeof server === "object" &&
		"server" in server &&
		(server as { server?: unknown }).server &&
		typeof (server as { server?: unknown }).server === "object" &&
		"port" in ((server as { server?: { port?: unknown } }).server ?? {})
	) {
		const actualPort = Number(
			(server as { server?: { port?: unknown } }).server?.port,
		);
		return Number.isFinite(actualPort) ? actualPort : fallbackPort;
	}

	return fallbackPort;
}

function startServerWithPortFallback(initialPort: number, maxAttempts = 200): void {
	for (let offset = 0; offset < maxAttempts; offset += 1) {
		const candidatePort = initialPort + offset;
		try {
			const server = app.listen(candidatePort);
			const listeningPort = resolveListeningPort(server, candidatePort);
			console.log(`Server is running on http://localhost:${listeningPort}`);
			return;
		} catch (error) {
			if (isAddressInUseError(error)) {
				continue;
			}
			throw error;
		}
	}

	throw new Error(
		`Could not start server: no available port found between ${initialPort} and ${initialPort + maxAttempts - 1}.`,
	);
}

startServerWithPortFallback(port);
