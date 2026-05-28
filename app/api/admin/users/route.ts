import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth-server";

export async function GET() {
  const res = await backendFetch("/api/admin/users");
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
