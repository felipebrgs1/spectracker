const API_URL = process.env.API_URL || "http://localhost:8787";

// Mapping from frontend API paths to backend paths
const PATH_MAP: Record<string, string> = {
	categories: "catalog/categories",
	components: "catalog/components",
	"dashboard/overview": "dashboard/overview",
};

export async function GET(request: Request, { params }: { params: Promise<{ proxy: string[] }> }) {
	const { proxy } = await params;
	const path = proxy.join("/");
	const { searchParams } = new URL(request.url);

	// Determine backend path
	let backendPath = PATH_MAP[path] || path;

	const targetUrl = new URL(`${API_URL}/${backendPath}`);
	searchParams.forEach((value, key) => {
		targetUrl.searchParams.set(key, value);
	});

	try {
		const res = await fetch(targetUrl.toString(), {
			cache: "no-store",
		});

		if (!res.ok) {
			const errorData = await res.json().catch(() => ({}));
			return Response.json(
				{ error: errorData.message || `Failed to fetch from backend: ${path}` },
				{ status: res.status },
			);
		}

		const data = await res.json();
		return Response.json(data);
	} catch (error) {
		console.error(`[API Proxy] Error fetching ${targetUrl}:`, error);
		return Response.json({ error: "Internal Server Error in API Proxy" }, { status: 500 });
	}
}
