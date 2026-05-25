import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    try {
        const res = await fetch(`${apiUrl}/api/paperbot/trend/all-state`, {
            cache: "no-store",
            signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`upstream ${res.status}`);
        const data = await res.json();
        return NextResponse.json(data, {
            status: 200,
            headers: { "Cache-Control": "no-store" },
        });
    } catch (err) {
        return NextResponse.json(
            { error: "trend all-state unavailable", detail: String(err) },
            { status: 503 },
        );
    }
}
