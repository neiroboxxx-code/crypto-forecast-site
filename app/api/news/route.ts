import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    try {
        const res = await fetch(`${apiUrl}/api/news`, {
            cache: "no-store",
            signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`upstream ${res.status}`);
        const data = await res.json();
        return NextResponse.json(data, {
            status: 200,
            headers: { "Cache-Control": "no-store" },
        });
    } catch {
        return NextResponse.json({ error: "news unavailable" }, { status: 503 });
    }
}
