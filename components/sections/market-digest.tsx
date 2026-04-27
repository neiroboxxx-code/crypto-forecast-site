"use client";

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
            if (t.startsWith("### ")) {
                const rest = t.slice(4).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
                return `<h3 class="mb-2 mt-5 first:mt-0 text-base font-semibold tracking-tight text-white/90">${rest}</h3>`;
            }
            if (t.startsWith("## ")) {
                const rest = t.slice(3).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
                return `<h2 class="mb-3 mt-7 first:mt-0 text-2xl font-semibold tracking-tight text-white">${rest}</h2>`;
            }
            if (t.startsWith("*") && t.endsWith("*") && t.length > 2) {
                const inner = t.slice(1, -1);
                return `<p class="mb-5 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm italic text-white/50">${inner}</p>`;
            }
            const lines = block.split("\n");
            const ul = lines.every((l) => l.trim().startsWith("- ") || l.trim() === "");
            if (ul) {
                const items = lines
                    .filter((l) => l.trim().startsWith("- "))
                    .map((l) => `<li>${l.replace(/^-\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>")}</li>`)
                    .join("");
                return `<ul class="mb-5 list-disc space-y-2 pl-5 text-base leading-7 text-white/72">${items}</ul>`;
            }
            return `<p class="mb-5 last:mb-0 text-base leading-8 text-white/74">${block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>").replace(/\n/g, "<br/>")}</p>`;
        })
        .join("");
}

function statusLabel(v: string): string {
    if (v === "ok") return "ok";
    if (v.startsWith("skipped")) return "нет ключа";
    if (v.startsWith("error: HTTP 429")) return "лимит";
    if (v.startsWith("error:")) return "ошибка";
    return v;
}

type Props = { data: MarketDigestData | null; error: string | null };

export function MarketDigest({ data, error }: Props) {
    if (error) {
        return (
            <Card title="Маркет-дайджест" className="border-white/8 p-6">
                <ErrorState message={error} />
            </Card>
        );
    }

    if (!data) {
        return (
            <Card title="Маркет-дайджест" className="border-white/8 p-6">
                <Skeleton className="h-72 w-full rounded-2xl" />
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
              ? "Сводка рынка · шаблон (без LLM)"
              : "Сводка рынка";

    const fetchStatus = data.meta?.fetchStatus;

    return (
        <Card
            className="border-white/8 bg-[#0E1117]/90 shadow-[0_24px_90px_rgba(0,0,0,0.32)]"
            padded={false}
        >
            <header className="border-b border-white/8 px-6 py-5 md:px-8 md:py-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
                            Daily market digest
                        </div>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                            {data.title}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-white/50">{subtitle}</p>
                    </div>
                    <time
                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/45 tabular-nums"
                        dateTime={data.updatedAt}
                    >
                        {updatedLabel}
                    </time>
                </div>
            </header>
            <div
                className="px-6 py-6 md:px-8 md:py-8 [&_em]:text-white/55 [&_strong]:font-semibold [&_strong]:text-white"
                dangerouslySetInnerHTML={{ __html: html }}
            />
            {fetchStatus && Object.keys(fetchStatus).length > 0 && (
                <footer className="border-t border-white/8 px-6 py-4 md:px-8">
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(fetchStatus).map(([k, v]) => {
                            const isOk = v === "ok";
                            const isLimit = v.includes("429");
                            const color = isOk
                                ? "text-emerald-300/90"
                                : isLimit
                                  ? "text-amber-300/80"
                                  : "text-white/40";
                            return (
                                <span
                                    key={k}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-black/20 px-2.5 py-1 text-[10px]"
                                >
                                    <span className="font-medium text-white/55">{k}</span>
                                    <span className={color}>{statusLabel(v)}</span>
                                </span>
                            );
                        })}
                    </div>
                </footer>
            )}
        </Card>
    );
}
