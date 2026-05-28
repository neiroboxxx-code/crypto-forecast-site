import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth-server";

export async function GET() {
  const res = await backendFetch("/api/admin/invites");
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST() {
  const res = await backendFetch("/api/admin/invites", { method: "POST" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
