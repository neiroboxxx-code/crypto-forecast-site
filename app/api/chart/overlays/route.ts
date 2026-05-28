import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") ?? "";
    const interval = searchParams.get("interval") ?? "";
    const res = await backendFetch(`/api/chart/overlays?symbol=${symbol}&interval=${interval}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: NextRequest) {
    const body = await request.json();
    const res = await backendFetch("/api/chart/overlays", {
        method: "PUT",
        body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
}
