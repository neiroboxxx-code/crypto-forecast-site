"use client";

import { useState } from "react";
import { AlertTriangle, Info, ListOrdered, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaperLogEntry } from "@/components/sections/paperbot/types";

type Props = {
    entries: PaperLogEntry[];
};

function levelIcon(level: PaperLogEntry["level"]) {
    if (level === "trade") return ListOrdered;
    if (level === "risk") return AlertTriangle;
    return Info;
}

function levelTone(level: PaperLogEntry["level"]) {
    if (level === "trade") return "border-cyan-400/25 bg-cyan-400/10 text-cyan-100";
    if (level === "risk") return "border-amber-400/25 bg-amber-400/10 text-amber-100";
    return "border-white/12 bg-white/5 text-white/70";
}

function levelLabel(level: PaperLogEntry["level"]) {
    if (level === "trade") return "Trade";
    if (level === "risk") return "Risk";
    return "Info";
}

export function PaperbotActivityLog({ entries }: Props) {
    const [open, setOpen] = useState(false);

    return (
        <Card
            className="border-emerald-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
            title="Журнал"
            subtitle="События бота в хронологическом порядке"
            right={
                entries.length > 0 ? (
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/50 transition hover:border-white/20 hover:text-white/70"
                        aria-expanded={open}
                    >
                        <span className="tabular-nums">{entries.length}</span>
                        <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                            aria-hidden
                        />
                    </button>
                ) : undefined
            }
        >
            {entries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-500/15 bg-black/25 px-4 py-8 text-center">
                    <p className="text-[12px] font-medium text-white/55">Журнал пуст</p>
                    <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-white/42">
                        Сюда попадут сигнал, расчёт риска, открытие и закрытие сделок, срабатывание SL/TP и отмены.
                        Новые записи будут сверху.
                    </p>
                </div>
            ) : (
                open && (
                    <ul className="flex max-h-[440px] flex-col gap-2 overflow-y-auto pr-1">
                    {entries.map((e) => {
                        const Icon = levelIcon(e.level);
                        return (
                            <li
                                key={e.id}
                                className="flex gap-3 rounded-xl border border-white/8 bg-black/25 p-3"
                            >
                                <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${levelTone(
                                        e.level,
                                    )}`}
                                >
                                    <Icon className="h-4 w-4" aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                                            {levelLabel(e.level)}
                                        </span>
                                        <span className="text-[10px] tabular-nums text-white/35">
                                            {new Date(e.ts).toLocaleString("ru-RU", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[12px] leading-relaxed text-white/65">{e.message}</p>
                                </div>
                            </li>
                        );
                    })}
                    </ul>
                )
            )}
        </Card>
    );
}
