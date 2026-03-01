import { NextResponse } from "next/server";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const apiUrl = process.env.API_URL || "http://localhost:8787";

	const res = await fetch(`${apiUrl}/gpu-specs/${id}`, {
		cache: "no-store",
	});

	if (!res.ok) {
		const status = res.status === 404 ? 404 : 500;
		return NextResponse.json(
			{ error: "Failed to fetch GPU detail" },
			{ status }
		);
	}

	const data = await res.json();
	return NextResponse.json(data);
}
