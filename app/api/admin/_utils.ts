import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(req: NextRequest): NextResponse | null {
    const adminToken = process.env.ADMIN_TOKEN ?? "";
    if (!adminToken) {
        return NextResponse.json({ error: "ADMIN_TOKEN is not configured" }, { status: 500 });
    }
    const session = req.cookies.get("admin_session")?.value ?? "";
    if (!session || session !== adminToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return null;
}

export function getUpstreamApiUrl(): string {
    return process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function getInternalApiToken(): string {
    return process.env.INTERNAL_API_TOKEN ?? "";
}

