import { ofetch } from "ofetch";

export const api = ofetch.create({
	baseURL: "/api",
	headers: {
		"Content-Type": "application/json",
	},
	retry: 1,
});
