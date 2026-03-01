import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const category = searchParams.get("category");
	const apiUrl = process.env.API_URL || "http://localhost:8787";

	const url = new URL(`${apiUrl}/catalog/components`);
	if (category) {
		url.searchParams.set("category", category);
	}

	const res = await fetch(url.toString(), {
		cache: "no-store",
	});

	if (!res.ok) {
		return NextResponse.json({ error: "Failed to fetch components" }, { status: 500 });
	}

	const data = await res.json();
	return NextResponse.json(data);
}
