import { NextRequest, NextResponse } from "next/server";

import { getInternalApiToken, getUpstreamApiUrl, requireAdmin } from "../../_utils";

export const dynamic = "force-dynamic";

function upstreamPath(action: string): { path: string; method: "POST" | "PUT" } | null {
    if (action === "start") return { path: "/api/paperbot/start", method: "POST" };
    if (action === "stop") return { path: "/api/paperbot/stop", method: "POST" };
    if (action === "run") return { path: "/api/paperbot/run", method: "POST" };
    if (action === "run-monitor") return { path: "/api/paperbot/run-monitor", method: "POST" };
    if (action === "settings") return { path: "/api/paperbot/settings", method: "PUT" };
    // Trend bot
    if (action === "trend-start") return { path: "/api/paperbot/trend/start", method: "POST" };
    if (action === "trend-stop") return { path: "/api/paperbot/trend/stop", method: "POST" };
    if (action === "trend-run") return { path: "/api/paperbot/run-trend", method: "POST" };
    if (action === "trend-monitor") return { path: "/api/paperbot/run-trend-monitor", method: "POST" };
    if (action === "trend-settings") return { path: "/api/paperbot/trend/settings", method: "PUT" };
    return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
    const gate = await requireAdmin(req);
    if (gate) return gate;

    const { action } = await ctx.params;
    const mapping = upstreamPath(action);
    if (!mapping) return NextResponse.json({ error: "unknown action" }, { status: 404 });
    if (mapping.method !== "POST") return NextResponse.json({ error: "method not allowed" }, { status: 405 });

    const token = getInternalApiToken();
    if (!token) return NextResponse.json({ error: "INTERNAL_API_TOKEN is not configured" }, { status: 500 });

    const upstream = getUpstreamApiUrl();
    const url = `${upstream}${mapping.path}${req.nextUrl.search}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "X-Internal-Token": token,
        },
        cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" } });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ action: string }> }) {
    const gate = await requireAdmin(req);
    if (gate) return gate;

    const { action } = await ctx.params;
    const mapping = upstreamPath(action);
    if (!mapping) return NextResponse.json({ error: "unknown action" }, { status: 404 });
    if (mapping.method !== "PUT") return NextResponse.json({ error: "method not allowed" }, { status: 405 });

    const token = getInternalApiToken();
    if (!token) return NextResponse.json({ error: "INTERNAL_API_TOKEN is not configured" }, { status: 500 });

    const upstream = getUpstreamApiUrl();
    const url = `${upstream}${mapping.path}${req.nextUrl.search}`;
    const body = await req.text();
    const res = await fetch(url, {
        method: "PUT",
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

