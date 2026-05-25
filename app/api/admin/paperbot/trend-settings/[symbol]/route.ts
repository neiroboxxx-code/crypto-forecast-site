import { NextRequest, NextResponse } from "next/server";
import { getInternalApiToken, getUpstreamApiUrl, requireAdmin } from "../../../_utils";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/paperbot/trend-settings/{symbol}
 * Proxies to PUT /api/paperbot/trend/settings/{symbol} on the backend.
 */
export async function PUT(
    req: NextRequest,
    ctx: { params: Promise<{ symbol: string }> },
) {
    const gate = requireAdmin(req);
    if (gate) return gate;

    const { symbol } = await ctx.params;
    if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

    const token = getInternalApiToken();
    if (!token) return NextResponse.json({ error: "INTERNAL_API_TOKEN is not configured" }, { status: 500 });

    const upstream = getUpstreamApiUrl();
    const url = `${upstream}/api/paperbot/trend/settings/${encodeURIComponent(symbol)}`;
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
    return new NextResponse(text, {
        status: res.status,
        headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
}
