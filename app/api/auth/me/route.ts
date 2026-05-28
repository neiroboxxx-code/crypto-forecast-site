import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  const res = await backendFetch("/api/auth/me");
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
