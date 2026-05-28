import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = await request.json();  // action: "block" | "unblock"
  const res = await backendFetch(`/api/admin/users/${id}/${action}`, { method: "POST" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
