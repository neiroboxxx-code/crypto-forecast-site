import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { NewsData } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const filePath = join(process.cwd(), "data", "latest-news.json");
        const raw = await readFile(filePath, "utf-8");
        const data = JSON.parse(raw) as NewsData;
        return NextResponse.json(data, {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
    } catch {
        return NextResponse.json({ error: "news unavailable" }, { status: 503 });
    }
}
