import { NextResponse } from "next/server";

export async function GET() {
	const apiUrl = process.env.API_URL || "http://localhost:8787";
	const res = await fetch(`${apiUrl}/dashboard/overview`, {
		cache: "no-store",
	});

	if (!res.ok) {
		return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
	}

	const data = await res.json();
	return NextResponse.json(data);
}
