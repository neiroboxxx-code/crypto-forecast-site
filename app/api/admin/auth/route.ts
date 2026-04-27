import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

export async function POST(req: NextRequest) {
    const { password } = await req.json().catch(() => ({ password: "" }));

    if (!ADMIN_TOKEN || password !== ADMIN_TOKEN) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", ADMIN_TOKEN, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
}

export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("admin_session");
    return res;
}

export async function GET(req: NextRequest) {
    const session = req.cookies.get("admin_session")?.value;
    const ok = !!ADMIN_TOKEN && session === ADMIN_TOKEN;
    return NextResponse.json({ ok });
}
