import { NextRequest, NextResponse } from "next/server";

import { getInternalApiToken, getUpstreamApiUrl, requireAdmin } from "../../_utils";

export const dynamic = "force-dynamic";

type Mapping = { path: string; method: "GET" | "POST" };

function mapAction(action: string, method: "GET" | "POST"): Mapping | null {
    if (action === "status" && method === "GET") return { path: "/api/admin/ml/status", method: "GET" };
    if (action === "train" && method === "POST") return { path: "/api/admin/ml/train", method: "POST" };
    if (action === "mode" && method === "POST") return { path: "/api/admin/ml/mode", method: "POST" };
    return null;
}

async function proxy(req: NextRequest, action: string, method: "GET" | "POST") {
    const gate = requireAdmin(req);
    if (gate) return gate;

    const mapping = mapAction(action, method);
    if (!mapping) return NextResponse.json({ error: "unknown action" }, { status: 404 });

    const token = getInternalApiToken();
    if (!token) return NextResponse.json({ error: "INTERNAL_API_TOKEN is not configured" }, { status: 500 });

    const upstream = getUpstreamApiUrl();
    const url = `${upstream}${mapping.path}${req.nextUrl.search}`;
    const res = await fetch(url, {
        method,
        headers: {
            Accept: "application/json",
            "X-Internal-Token": token,
        },
        cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
    const { action } = await ctx.params;
    return proxy(req, action, "GET");
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
    const { action } = await ctx.params;
    return proxy(req, action, "POST");
}
