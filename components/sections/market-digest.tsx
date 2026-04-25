"use client";

import { useEffect, useState } from "react";
import type { MarketDigestData } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

function renderMarkdownLite(md: string): string {
    const escaped = md
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return escaped
        .split(/\n\n+/)
        .map((block) => {
            const t = block.trim();
            if (t.startsWith("## ")) {
                const rest = t.slice(3).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
                return `<h2 class="mb-2 mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">${rest}</h2>`;
            }
            if (t.startsWith("*") && t.endsWith("*") && t.length > 2) {
                const inner = t.slice(1, -1);
                return `<p class="mb-2 text-white/45 italic">${inner}</p>`;
            }
            const lines = block.split("\n");
            const ul = lines.every((l) => l.trim().startsWith("- ") || l.trim() === "");
            if (ul) {
                const items = lines
                    .filter((l) => l.trim().startsWith("- "))
                    .map((l) => `<li>${l.replace(/^-\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>")}</li>`)
                    .join("");
                return `<ul class="list-disc pl-4 space-y-1">${items}</ul>`;
            }
            return `<p class="mb-2 last:mb-0">${block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>").replace(/\n/g, "<br/>")}</p>`;
        })
        .join("");
}

export function MarketDigest() {
    const [data, setData] = useState<MarketDigestData | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/digest", { cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as MarketDigestData;
                if (!cancelled) setData(json);
            } catch {
                if (!cancelled) setErr("Не удалось загрузить дайджест");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (err) {
        return (
            <Card title="Маркет-дайджест" className="border-white/8">
                <ErrorState message={err} />
            </Card>
        );
    }

    if (!data) {
        return (
            <Card title="Маркет-дайджест" className="border-white/8">
                <Skeleton className="h-24 w-full rounded-lg" />
            </Card>
        );
    }

    const html = renderMarkdownLite(data.bodyMarkdown);
    const updatedLabel = new Date(data.updatedAt).toLocaleString("ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
    const src = data.meta?.source;
    const subtitle =
        src === "llm"
            ? "Сводка рынка · LLM"
            : src === "fallback"
              ? "Сводка рынка · шаблон (без LLM или LLM недоступен)"
              : "Сводка рынка";

    return (
        <Card
            title={data.title}
            subtitle={subtitle}
            right={
                <time className="text-[10px] text-white/40 tabular-nums" dateTime={data.updatedAt}>
                    {updatedLabel}
                </time>
            }
            className="border-white/8"
        >
            <div
                className="text-[11px] leading-relaxed text-white/55 [&_strong]:text-white/85"
                dangerouslySetInnerHTML={{ __html: html }}
            />
            {data.meta?.fetchStatus && Object.keys(data.meta.fetchStatus).length > 0 && (
                <div className="mt-3 border-t border-white/8 pt-2 text-[9px] text-white/35">
                    {Object.entries(data.meta.fetchStatus).map(([k, v]) => (
                        <span key={k} className="mr-2 inline-block">
                            {k}: <span className={v === "ok" ? "text-emerald-400/80" : ""}>{v}</span>
                        </span>
                    ))}
                </div>
            )}
        </Card>
    );
}
