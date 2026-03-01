import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const search = searchParams.get("search") || "";
	const limit = searchParams.get("limit") || "50";
	const apiUrl = process.env.API_URL || "http://localhost:8787";

	const url = new URL(`${apiUrl}/gpu-specs`);
	if (search) {
		url.searchParams.set("search", search);
	}
	url.searchParams.set("limit", limit);

	const res = await fetch(url.toString(), {
		cache: "no-store",
	});

	if (!res.ok) {
		return NextResponse.json({ error: "Failed to fetch GPU specs" }, { status: 500 });
	}

	const data = await res.json();
	return NextResponse.json(data);
}
