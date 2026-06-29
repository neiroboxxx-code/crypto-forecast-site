import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { jwtVerify } from "jose";

/** New JWT auth: true if the auth_token cookie has a valid token with role=admin. */
async function checkJwtAdmin(req: NextRequest): Promise<boolean> {
    const token = req.cookies.get("auth_token")?.value;
    if (!token || !process.env.JWT_SECRET) return false;
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        return (payload as { role?: string }).role === "admin";
    } catch {
        return false;
    }
}

/**
 * Admin gate for action routes (paperbot/trend control).
 * Primary path: the same JWT auth_token the rest of the site uses (role=admin).
 * Fallback: the legacy password-based admin_session cookie.
 * Returns null when authorized, or a 401 NextResponse otherwise.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
    // 1. New JWT auth (role=admin) — what a normal admin login gives you.
    if (await checkJwtAdmin(req)) return null;

    // 2. Legacy admin_session cookie (old password login).
    const adminToken = process.env.ADMIN_TOKEN ?? "";
    const sessionSecret = process.env.ADMIN_SESSION_SECRET ?? adminToken;
    const session = req.cookies.get("admin_session")?.value ?? "";
    if (adminToken && session && verifyAdminSession(session, sessionSecret)) return null;

    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function b64urlEncode(buf: Buffer): string {
    return buf.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlDecode(s: string): Buffer {
    const pad = (4 - (s.length % 4)) % 4;
    const b64 = s.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(pad);
    return Buffer.from(b64, "base64");
}

function sign(payloadB64: string, secret: string): string {
    const mac = crypto.createHmac("sha256", secret).update(payloadB64).digest();
    return b64urlEncode(mac);
}

export function mintAdminSession(secret: string, ttlSeconds = 60 * 60 * 24 * 7): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = { v: 1, iat: now, exp: now + ttlSeconds };
    const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload), "utf-8"));
    const sig = sign(payloadB64, secret);
    return `${payloadB64}.${sig}`;
}

function verifyAdminSession(token: string, secret: string): boolean {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payloadB64, sigB64] = parts;
    if (!payloadB64 || !sigB64) return false;

    const expected = sign(payloadB64, secret);
    try {
        const a = b64urlDecode(sigB64);
        const b = b64urlDecode(expected);
        if (a.length !== b.length) return false;
        if (!crypto.timingSafeEqual(a, b)) return false;
    } catch {
        return false;
    }

    try {
        const raw = b64urlDecode(payloadB64).toString("utf-8");
        const payload = JSON.parse(raw) as { exp?: number; v?: number };
        if (payload?.v !== 1) return false;
        const exp = payload?.exp ?? 0;
        if (!Number.isFinite(exp) || exp <= 0) return false;
        const now = Math.floor(Date.now() / 1000);
        return now <= exp;
    } catch {
        return false;
    }
}

export function getUpstreamApiUrl(): string {
    return process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function getInternalApiToken(): string {
    return process.env.INTERNAL_API_TOKEN ?? "";
}

