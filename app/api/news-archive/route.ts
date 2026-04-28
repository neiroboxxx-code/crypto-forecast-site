import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const filePath = join(process.cwd(), "data", "news-archive.json");
        const raw = await readFile(filePath, "utf-8");
        const data = JSON.parse(raw);
        return NextResponse.json(data, {
            status: 200,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
    } catch {
        return NextResponse.json({ error: "archive unavailable" }, { status: 503 });
    }
}
