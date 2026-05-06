import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function upstreamApiUrl(): string {
    return process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function internalToken(): string {
    return process.env.INTERNAL_API_TOKEN ?? "";
}

export async function POST(req: NextRequest) {
    const token = internalToken();
    if (!token) return NextResponse.json({ error: "INTERNAL_API_TOKEN is not configured" }, { status: 500 });

    const upstream = upstreamApiUrl();
    const url = `${upstream}/api/companion/plan`;
    const body = await req.text();

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": req.headers.get("content-type") ?? "application/json",
            "X-Internal-Token": token,
        },
        body,
        cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
}

