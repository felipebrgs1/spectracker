import { resolve } from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: resolve(process.cwd(), "../../.env") });

import { cors } from "@elysiajs/cors";
import { createContext } from "@spectracker/api/context";
import { appRouter } from "@spectracker/api/routers/index";
import { syncCpuOffersFromKabum } from "@spectracker/db/ingestion";
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

new Elysia()
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
	.get("/", () => "OK")
	.listen(3000, () => {
		console.log("Server is running on http://localhost:3000");
	});
