"use client";

import { useEffect, useState } from "react";

export type ArchiveEntry = {
    date: string;
    updatedAt: string;
    title: string;
    bodyMarkdown: string;
};

function fmtDateBtn(dateStr: string): { day: string; month: string } {
    const d = new Date(dateStr + "T12:00:00Z");
    return {
        day: d.toLocaleDateString("ru-RU", { day: "numeric" }),
        month: d.toLocaleDateString("ru-RU", { month: "short" }),
    };
}

type Props = {
    selected: ArchiveEntry | null;
    onSelect: (entry: ArchiveEntry | null) => void;
};

export function DigestArchiveSidebar({ selected, onSelect }: Props) {
    const [entries, setEntries] = useState<ArchiveEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const todayUTC = new Date().toISOString().slice(0, 10);
        fetch("/api/digest-archive", { cache: "no-store" })
            .then((r) => (r.ok ? r.json() : []))
            .then((data: ArchiveEntry[]) => {
                // Сегодняшняя дата не показывается в архиве —
                // актуальный выпуск живёт в центральном блоке.
                setEntries(data.filter((e) => e.date < todayUTC));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#0E1117]/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="absolute -right-12 top-8 h-32 w-32 rounded-full bg-fuchsia-400/8 blur-3xl pointer-events-none" />

            <div className="relative space-y-3">
                {/* Header */}
                <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35">
                        Archive
                    </div>
                    <h2 className="mt-1 text-base font-semibold tracking-tight text-white">
                        Архив дайджестов
                    </h2>
                </div>

                {/* Current button */}
                <button
                    type="button"
                    onClick={() => onSelect(null)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                        selected === null
                            ? "border-cyan-400/35 bg-cyan-400/[0.07] text-cyan-200"
                            : "border-white/8 bg-white/[0.02] text-white/50 hover:border-white/15 hover:text-white/75"
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.1em]">
                            Текущий
                        </span>
                        {selected === null && (
                            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-cyan-300" />
                        )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-white/35">свежий выпуск</p>
                </button>

                {/* Divider */}
                {entries.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-white/8" />
                        <span className="text-[9px] uppercase tracking-[0.14em] text-white/25">выпуски</span>
                        <div className="h-px flex-1 bg-white/8" />
                    </div>
                )}

                {/* Archive date buttons */}
                {loading && (
                    <div className="space-y-1.5">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
                        ))}
                    </div>
                )}

                {!loading && entries.length === 0 && (
                    <p className="text-[11px] text-white/30">
                        Архив пуст — появится после следующего выпуска
                    </p>
                )}

                <div className="space-y-1.5">
                    {entries.map((entry) => {
                        const isActive = selected?.date === entry.date;
                        const { day, month } = fmtDateBtn(entry.date);
                        return (
                            <button
                                key={entry.date}
                                type="button"
                                onClick={() => onSelect(entry)}
                                className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                                    isActive
                                        ? "border-white/20 bg-white/[0.06] text-white/85"
                                        : "border-white/8 bg-white/[0.02] text-white/45 hover:border-white/15 hover:text-white/70"
                                }`}
                            >
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[15px] font-semibold tabular-nums leading-none">
                                        {day}
                                    </span>
                                    <span className="text-[11px]">{month}</span>
                                </div>
                                <p className="mt-0.5 truncate text-[10px] text-white/30">
                                    {entry.title}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
