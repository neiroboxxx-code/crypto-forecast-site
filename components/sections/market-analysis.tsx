"use client";

import { getMarketThesis, type MarketThesis } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { fmtTime } from "@/lib/format";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Minimal Markdown → HTML renderer. Input is escaped first so any HTML the LLM
// emits becomes text; we then recognize a small, safe subset of Markdown and
// rebuild allowed tags ourselves. Supports headings (#, ##, ###), bold/italic,
// inline code, links, unordered/ordered lists, blockquotes, and paragraphs.
function renderMarkdown(raw: string): string {
    const src = escapeHtml(raw.replace(/\r\n/g, "\n").trim());
    const lines = src.split("\n");

    const out: string[] = [];
    let i = 0;

    const inline = (s: string): string =>
        s
            // links [label](url) — url allowed for http(s)/mailto only
            .replace(
                /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
            )
            // inline code `x`
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            // bold **x** or __x__
            .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
            .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
            // italic *x* or _x_
            .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
            .replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

    while (i < lines.length) {
        const line = lines[i];

        // blank line — paragraph break
        if (!line.trim()) {
            i++;
            continue;
        }

        // headings
        const h = /^(#{1,3})\s+(.*)$/.exec(line);
        if (h) {
            const level = h[1].length;
            out.push(`<h${level}>${inline(h[2])}</h${level}>`);
            i++;
            continue;
        }

        // blockquote
        if (/^>\s?/.test(line)) {
            const buf: string[] = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) {
                buf.push(lines[i].replace(/^>\s?/, ""));
                i++;
            }
            out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
            continue;
        }

        // unordered list
        if (/^[-*+]\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
                items.push(`<li>${inline(lines[i].replace(/^[-*+]\s+/, ""))}</li>`);
                i++;
            }
            out.push(`<ul>${items.join("")}</ul>`);
            continue;
        }

        // ordered list
        if (/^\d+\.\s+/.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
                items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
                i++;
            }
            out.push(`<ol>${items.join("")}</ol>`);
            continue;
        }

        // paragraph — collect consecutive non-blank, non-block lines
        const buf: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !/^(#{1,3})\s+/.test(lines[i]) &&
            !/^>\s?/.test(lines[i]) &&
            !/^[-*+]\s+/.test(lines[i]) &&
            !/^\d+\.\s+/.test(lines[i])
        ) {
            buf.push(lines[i]);
            i++;
        }
        for (const lineText of buf) {
            out.push(`<p>${inline(lineText)}</p>`);
        }
    }

    return out.join("\n");
}

function taskLabel(task: string): string {
    switch (task) {
        case "summarize_week":
            return "Weekly summary";
        case "analyze_candidate":
            return "Candidate alert";
        case "explain_no_candidate":
            return "Market context";
        case "none":
            return "Silent monitoring";
        default:
            return task;
    }
}

function EmptyState({ task }: { task: string }) {
    if (task === "none") {
        return (
            <div className="rounded-lg border border-white/8 bg-black/30 py-8 px-4 text-center text-xs leading-relaxed text-white/50">
                Движок пока не фиксирует значимого структурного контекста.
                <div className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                    Текст появится, когда система отметит кандидата на разворот
                </div>
            </div>
        );
    }
    return (
        <div className="rounded-lg border border-white/8 bg-black/30 py-8 px-4 text-center text-xs text-white/50">
            Исторические события недоступны ({taskLabel(task)}).
        </div>
    );
}

function pickThesisText(data: MarketThesis | null): string | null {
    if (!data) return null;
    // Preferred key first, then legacy / alternate names.
    const candidates: Array<string | null | undefined> = [
        data.thesis,
        data.text,
        (data as unknown as { analysis?: string | null }).analysis,
        (data as unknown as { body?: string | null }).body,
        (data as unknown as { content?: string | null }).content,
    ];
    for (const c of candidates) {
        if (typeof c === "string" && c.trim().length > 0) return c;
    }
    return null;
}

type ThesisEvent = NonNullable<MarketThesis["events"]>[number];

function SnapshotLightbox({ event, onClose }: { event: ThesisEvent; onClose: () => void }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    useEffect(() => {
        if (!event) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [event, onClose]);

    if (!mounted || !event.snapshot_url) return null;

    return createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/88 p-3 backdrop-blur-sm">
            <button
                type="button"
                aria-label="Закрыть снимок"
                onClick={onClose}
                className="absolute inset-0 cursor-default"
            />
            <div className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0E1117] shadow-2xl">
                <header className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                    <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/65">
                            Историческое событие {event.ordinal}
                        </div>
                        <div className="mt-0.5 truncate text-sm font-semibold text-white">
                            BTCUSDT · 4H · {event.bias === "long" ? "long" : event.bias === "short" ? "short" : "wait"}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition hover:border-white/25 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-auto bg-black p-2">
                    <img
                        src={event.snapshot_url}
                        alt={`Снимок события ${event.ordinal}`}
                        className="mx-auto max-h-[82vh] max-w-full rounded-lg object-contain"
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
}

/**
 * Fetches the DeepSeek thesis and renders its body as Markdown.
 * Used by the analytics dropdown inside ChartPanel.
 */
export function MarketThesisContent() {
    const { data, loading, error } = useApi<MarketThesis>(getMarketThesis);
    const [activeEvent, setActiveEvent] = useState<ThesisEvent | null>(null);

    if (loading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-4/5" />
            </div>
        );
    }

    if (error) return <ErrorState message={error} />;
    if (!data) return null;

    const task = data.task ?? "unknown";
    const generatedAt = data.generated_at;
    const text = pickThesisText(data);
    const events = (data.events ?? []).filter((event) => event.snapshot_url);

    const meta = (
        <div className="mb-3 flex items-center gap-1.5">
            <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
                {taskLabel(task)}
            </span>
            {generatedAt && (
                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] tabular-nums text-white/45">
                    {fmtTime(generatedAt)}
                </span>
            )}
        </div>
    );

    if (data.error) {
        return (
            <>
                {meta}
                <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200/90">
                    <div className="font-semibold uppercase tracking-wider text-[10px] text-amber-300">
                        LLM offline
                    </div>
                    <div className="mt-1 text-amber-100/80">{data.error}</div>
                </div>
            </>
        );
    }

    if (!text) {
        return (
            <>
                {meta}
                <EmptyState task={task} />
            </>
        );
    }

    return (
        <>
            {meta}
            {events.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {events.map((event) => (
                        <button
                            key={event.id}
                            type="button"
                            onClick={() => setActiveEvent(event)}
                            className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200 transition hover:border-cyan-400/45 hover:bg-cyan-400/[0.12]"
                        >
                            Событие {event.ordinal}
                        </button>
                    ))}
                </div>
            )}
            <div
                className="thesis-prose text-[12.5px] leading-[1.65] text-white/80"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
            />
            {activeEvent && (
                <SnapshotLightbox event={activeEvent} onClose={() => setActiveEvent(null)} />
            )}
        </>
    );
}
