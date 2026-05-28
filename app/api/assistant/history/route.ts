import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth-server";

export async function GET() {
  const res = await backendFetch("/api/assistant/history");
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
