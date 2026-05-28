import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  // Tell backend to invalidate session
  await backendFetch("/api/auth/logout", { method: "POST" }).catch(() => {});

  // Clear cookie regardless of backend response
  const response = NextResponse.json({ status: "ok" });
  response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
  return response;
}
