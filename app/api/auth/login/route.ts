import { NextRequest, NextResponse } from "next/server";
import { cookieOptions } from "@/lib/auth-server";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${BACKEND}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  // Set httpOnly cookie on Vercel domain
  const response = NextResponse.json({
    status: "ok",
    nickname: data.nickname,
    role: data.role,
  });
  response.cookies.set("auth_token", data.token, cookieOptions());
  return response;
}
