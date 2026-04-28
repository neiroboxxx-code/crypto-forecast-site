"use client";

import { useEffect, useState } from "react";
import { fmtClock } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type ArchiveItem = {
    published_at: string | null;
    source: string | null;
    title: string;
    url: string | null;
    summary: string | null;
    sentiment: number;
    impact_score: number | null;
    btc_relevance_score: number | null;
    market_regime_effect: string | null;
};

type ArchiveDay = {
    date: string;
    count: number;
    items: ArchiveItem[];
};

type ArchiveData = {
    generated_at: string;
    total_items: number;
    days: ArchiveDay[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function regimeBadge(v: string | null | undefined): { label: string; cls: string } | null {
    if (v === "risk_off") return { label: "RISK-OFF", cls: "border-amber-400/25 bg-amber-400/10 text-amber-300" };
    if (v === "risk_on") return { label: "RISK-ON", cls: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300" };
    if (v === "macro_uncertainty") return { label: "MACRO", cls: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300" };
    return null;
}

function sentimentDot(s: number): string {
    if (s > 0.12) return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]";
    if (s < -0.12) return "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.5)]";
    return "bg-white/25";
}

function fmtDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

// ── Item ──────────────────────────────────────────────────────────────────────

function ArchiveItemRow({ item }: { item: ArchiveItem }) {
    const [open, setOpen] = useState(false);
    const reg = regimeBadge(item.market_regime_effect);

    return (
        <article className="border-b border-white/5 last:border-0">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full px-3 py-2.5 text-left transition hover:bg-white/[0.02]"
            >
                <div className="flex items-center gap-1.5">
                    {reg && (
                        <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${reg.cls}`}>
                            {reg.label}
                        </span>
                    )}
                    <span className={`ml-auto shrink-0 h-1.5 w-1.5 rounded-full ${sentimentDot(item.sentiment)}`} />
                    {item.published_at && (
                        <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/30">
                            {fmtClock(item.published_at)}
                        </span>
                    )}
                </div>
                <p className="mt-1 text-[12px] leading-5 text-white/80">{item.title}</p>
            </button>

            {open && (
                <div className="border-t border-white/5 bg-white/[0.015] px-3 py-2.5">
                    {item.summary && (
                        <p className="text-[11px] leading-5 text-white/50">{item.summary}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-white/35">
                        <span>{item.source ?? ""}</span>
                        <div className="flex items-center gap-3">
                            {item.btc_relevance_score !== null && (
                                <span>btc rel: {item.btc_relevance_score}</span>
                            )}
                            {item.url && (
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-white/60 hover:bg-white/10"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Open ↗
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
}

// ── Day accordion ─────────────────────────────────────────────────────────────

function DaySection({ day, defaultOpen }: { day: ArchiveDay; defaultOpen: boolean }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rounded-xl border border-white/8 bg-black/20 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 transition hover:bg-white/[0.03]"
            >
                <span className="text-[13px] font-semibold text-white/85">
                    {fmtDateLabel(day.date)}
                </span>
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] tabular-nums text-white/45">
                        {day.count}
                    </span>
                    <span className={`text-[11px] text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
                        ▾
                    </span>
                </div>
            </button>

            {open && (
                <div className="border-t border-white/6">
                    {day.items.map((item, i) => (
                        <ArchiveItemRow key={`${item.url ?? item.title}-${i}`} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NewsArchive() {
    const [data, setData] = useState<ArchiveData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!visible) return;
        fetch("/api/news-archive", { cache: "no-store" })
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json() as Promise<ArchiveData>;
            })
            .then(setData)
            .catch(() => setError("Не удалось загрузить архив новостей"));
    }, [visible]);

    return (
        <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-white/90">
                        Архив новостей
                    </h2>
                    <p className="mt-0.5 text-[12px] text-white/40">
                        Последние 20 дней — все значимые макро-события
                    </p>
                </div>
                {!visible && (
                    <button
                        type="button"
                        onClick={() => setVisible(true)}
                        className="rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/65 transition hover:bg-white/[0.08] hover:text-white/85"
                    >
                        Показать архив
                    </button>
                )}
            </div>

            {visible && (
                <>
                    {!data && !error && (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-[12px] text-rose-300/80">
                            {error}
                        </div>
                    )}

                    {data && (
                        <div className="space-y-2">
                            {data.days.map((day, i) => (
                                <DaySection key={day.date} day={day} defaultOpen={i === 0} />
                            ))}
                            <p className="pt-1 text-center text-[10px] text-white/25">
                                {data.total_items} записей · обновлено ежедневно в 04:15 UTC
                            </p>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
