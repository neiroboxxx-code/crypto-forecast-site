"use client";

import { useEffect, useState } from "react";

type ArchiveEntry = {
    date: string;
    updatedAt: string;
    title: string;
    bodyMarkdown: string;
};

function renderMarkdownLite(md: string): string {
    const escaped = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
                    .map((l) => `<li>${l.replace(/^-\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`)
                    .join("");
                return `<ul class="mb-5 list-disc space-y-2 pl-5 text-base leading-7 text-white/72">${items}</ul>`;
            }
            return `<p class="mb-5 last:mb-0 text-base leading-8 text-white/74">${block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/_(.+?)_/g, "<em>$1</em>").replace(/\n/g, "<br/>")}</p>`;
        })
        .join("");
}

function fmtDateBtn(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function DigestArchive() {
    const [entries, setEntries] = useState<ArchiveEntry[]>([]);
    const [selected, setSelected] = useState<ArchiveEntry | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch("/api/digest-archive", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: ArchiveEntry[]) => {
                setEntries(data);
                if (data.length > 0) setSelected(data[0]);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, []);

    if (!loaded) {
        return (
            <div className="mt-4 rounded-3xl border border-white/8 bg-[#0E1117]/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.32)]">
                <div className="h-6 w-40 animate-pulse rounded-lg bg-white/8" />
                <div className="mt-3 flex gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-7 w-16 animate-pulse rounded-full bg-white/6" />
                    ))}
                </div>
                <div className="mt-5 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-4 animate-pulse rounded bg-white/5" />
                    ))}
                </div>
            </div>
        );
    }

    if (entries.length === 0) return null;

    const html = selected ? renderMarkdownLite(selected.bodyMarkdown) : "";
    const updatedLabel = selected
        ? new Date(selected.updatedAt).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
          })
        : "";

    return (
        <div className="mt-4 rounded-3xl border border-white/8 bg-[#0E1117]/90 shadow-[0_24px_90px_rgba(0,0,0,0.32)]">
            <header className="border-b border-white/8 px-6 py-5 md:px-8 md:py-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
                            Archive
                        </div>
                        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white/80">
                            {selected?.title ?? "Архив дайджестов"}
                        </h2>
                    </div>
                    {updatedLabel && (
                        <time className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/40 tabular-nums">
                            {updatedLabel}
                        </time>
                    )}
                </div>

                {/* Date pills */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {entries.map((e) => {
                        const isActive = selected?.date === e.date;
                        return (
                            <button
                                key={e.date}
                                type="button"
                                onClick={() => setSelected(e)}
                                className={`rounded-full border px-3 py-1 text-[11px] font-medium tabular-nums transition ${
                                    isActive
                                        ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                                        : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70"
                                }`}
                            >
                                {fmtDateBtn(e.date)}
                            </button>
                        );
                    })}
                </div>
            </header>

            {selected && (
                <div
                    className="px-6 py-6 md:px-8 md:py-8 [&_em]:text-white/55 [&_strong]:font-semibold [&_strong]:text-white"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            )}
        </div>
    );
}
