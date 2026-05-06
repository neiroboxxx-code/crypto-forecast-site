import { NextRequest, NextResponse } from "next/server";

import { mintAdminSession } from "../_utils";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

export async function POST(req: NextRequest) {
    const { password } = await req.json().catch(() => ({ password: "" }));

    if (!ADMIN_TOKEN || password !== ADMIN_TOKEN) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? ADMIN_TOKEN;
    const ttlSeconds = 60 * 60 * 24 * 7; // 7 days
    const session = mintAdminSession(sessionSecret, ttlSeconds);

    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", session, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: ttlSeconds,
    });
    return res;
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("admin_session");
    return res;
}

export async function GET(req: NextRequest) {
    const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? ADMIN_TOKEN;
    const session = req.cookies.get("admin_session")?.value ?? "";
    const ok = !!ADMIN_TOKEN && !!session && sessionSecret.length > 0;
    if (!ok) return NextResponse.json({ ok: false });

    // Reuse the same gate as admin proxy.
    const { requireAdmin } = await import("../_utils");
    const gate = requireAdmin(req);
    if (gate) return NextResponse.json({ ok: false }, { status: 200 });
    return NextResponse.json({ ok });
}
