import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth-server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await backendFetch(`/api/assistant/thread/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
