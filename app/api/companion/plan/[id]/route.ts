import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function upstreamApiUrl(): string {
    return process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function internalToken(): string {
    return process.env.INTERNAL_API_TOKEN ?? "";
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const token = internalToken();
    if (!token) return NextResponse.json({ error: "INTERNAL_API_TOKEN is not configured" }, { status: 500 });

    const { id } = await ctx.params;
    const upstream = upstreamApiUrl();
    const url = `${upstream}/api/companion/plan/${encodeURIComponent(id)}`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            Accept: "application/json",
            "X-Internal-Token": token,
        },
        cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
}

