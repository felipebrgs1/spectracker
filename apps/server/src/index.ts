import { setupRoutes } from "./routes";

export default {
	async fetch(request: Request, env: any): Promise<Response> {
		const app = setupRoutes(env.DB);
		return await app.handle(request);
	},
};
