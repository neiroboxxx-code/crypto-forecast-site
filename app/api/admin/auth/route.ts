import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { mintAdminSession } from "../_utils";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "");

/** Check new JWT-based auth: returns true if cookie has a valid token with role=admin */
async function checkJwtAdmin(req: NextRequest): Promise<boolean> {
    const token = req.cookies.get("auth_token")?.value;
    if (!token || !process.env.JWT_SECRET) return false;
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return (payload as { role?: string }).role === "admin";
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    // Allow login via old ADMIN_TOKEN password (backward compat)
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
    // 1. Check new JWT-based auth (role=admin) — primary path
    if (await checkJwtAdmin(req)) {
        return NextResponse.json({ ok: true });
    }

    // 2. Fall back to legacy admin_session cookie
    const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? ADMIN_TOKEN;
    const session = req.cookies.get("admin_session")?.value ?? "";
    const ok = !!ADMIN_TOKEN && !!session && sessionSecret.length > 0;
    if (!ok) return NextResponse.json({ ok: false });

    const { requireAdmin } = await import("../_utils");
    const gate = await requireAdmin(req);
    if (gate) return NextResponse.json({ ok: false }, { status: 200 });
    return NextResponse.json({ ok });
}
