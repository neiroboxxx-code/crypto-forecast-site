import { NextRequest, NextResponse } from "next/server";

import { backendFetch } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// Same admin-auth path as the Users tab: backendFetch forwards the admin's
// bearer token; the backend enforces require_admin. (No X-Internal-Token here —
// that pattern needs INTERNAL_API_TOKEN configured, which read-tabs don't use.)
function mapAction(action: string, method: "GET" | "POST"): string | null {
    if (action === "status" && method === "GET") return "/api/admin/ml/status";
    if (action === "train" && method === "POST") return "/api/admin/ml/train";
    if (action === "mode" && method === "POST") return "/api/admin/ml/mode";
    return null;
}

async function proxy(req: NextRequest, action: string, method: "GET" | "POST") {
    const path = mapAction(action, method);
    if (!path) return NextResponse.json({ error: "unknown action" }, { status: 404 });

    const res = await backendFetch(`${path}${req.nextUrl.search}`, { method });
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
