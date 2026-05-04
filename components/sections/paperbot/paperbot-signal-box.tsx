"use client";

import { ArrowUpRight, ArrowDownRight, Minus, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaperSignalState, PaperSettings } from "@/components/sections/paperbot/types";
import { useApi } from "@/hooks/use-api";
import { getReversal, type ReversalCandidate } from "@/lib/api";

type Props = {
    signal: PaperSignalState | null;
    settings: PaperSettings;
    /** Компактный блок админки: без подзаголовка Radar, короче порог. */
    compact?: boolean;
};

function meetsThreshold(signal: PaperSignalState, settings: PaperSettings): boolean {
    const confRank = { low: 0, medium: 1, high: 2 };
    const probOk = signal.probability * 100 >= settings.minProbabilityPct;
    const confOk = confRank[signal.confidence] >= confRank[settings.minConfidence];
    const dirOk =
        (signal.direction === "bull" && settings.allowLong) ||
        (signal.direction === "bear" && settings.allowShort);
    return probOk && confOk && dirOk && signal.direction !== "neutral";
}

function dirLabel(d: PaperSignalState["direction"]) {
    if (d === "bull") return "LONG BIAS";
    if (d === "bear") return "SHORT BIAS";
    return "НЕЙТРАЛЬНО";
}

function dirTone(d: PaperSignalState["direction"]) {
    if (d === "bull") return { text: "text-emerald-400", border: "border-emerald-400/25 bg-emerald-400/[0.06]" };
    if (d === "bear") return { text: "text-rose-400", border: "border-rose-400/25 bg-rose-400/[0.06]" };
    return { text: "text-cyan-300", border: "border-white/12 bg-white/[0.03]" };
}

function DirIcon({ d }: { d: PaperSignalState["direction"] }) {
    if (d === "bull") return <ArrowUpRight className="h-5 w-5" aria-hidden />;
    if (d === "bear") return <ArrowDownRight className="h-5 w-5" aria-hidden />;
    return <Minus className="h-5 w-5" aria-hidden />;
}

function confShort(c: PaperSignalState["confidence"]) {
    return c === "high" ? "HIGH" : c === "medium" ? "MED" : "LOW";
}

function gradeLabel(cls: string): string {
    if (cls === "high")   return "STRONG";
    if (cls === "medium") return "MED";
    return "WEAK";
}

function gradeCls(cls: string): string {
    if (cls === "high")   return "border-emerald-400/30 text-emerald-300/80";
    if (cls === "medium") return "border-amber-400/30 text-amber-300/80";
    return "border-white/15 text-white/40";
}

function CandidatesSection({ compact }: { compact?: boolean }) {
    const { data, loading } = useApi(getReversal, [], { intervalMs: 4 * 60 * 60 * 1000 });
    const candidates: ReversalCandidate[] = data?.candidates ?? [];

    return (
        <div className="border-t border-white/6 pt-2">
            <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                Reversal Candidates
            </div>

            {loading && !data && (
                <div className="h-3 w-24 animate-pulse rounded bg-white/8" />
            )}

            {!loading && candidates.length === 0 && (
                <div className="text-[10px] text-white/30">Нет кандидатов</div>
            )}

            {candidates.length > 0 && (
                <div className="space-y-1">
                    {candidates.map((c) => {
                        const isLong = c.direction === "bullish";
                        const dirColor = isLong ? "text-emerald-400" : "text-rose-400";
                        const score = c.scores?.total_score ?? null;
                        return (
                            <div
                                key={c.candidate_id}
                                className="flex items-center gap-1.5 text-[10px]"
                            >
                                <span className={`font-bold ${dirColor}`}>
                                    {isLong ? "LONG" : "SHORT"}
                                </span>
                                <span className="text-white/35">{c.timeframe_main}</span>
                                <span className={`rounded border px-1 py-px text-[9px] uppercase ${gradeCls(c.classification)}`}>
                                    {gradeLabel(c.classification)}
                                </span>
                                {score !== null && (
                                    <span className="ml-auto tabular-nums text-white/40">
                                        {score.toFixed(1)}/10
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ConfBadge({ c }: { c: PaperSignalState["confidence"] }) {
    const cls =
        c === "high"
            ? "border-emerald-400/30 text-emerald-300/70"
            : c === "medium"
            ? "border-amber-400/30 text-amber-300/70"
            : "border-white/15 text-white/40";
    return (
        <span className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${cls}`}>
            {c === "high" ? "HIGH" : c === "medium" ? "MED" : "LOW"}
        </span>
    );
}

function ProbBar({ prob, dir }: { prob: number; dir: PaperSignalState["direction"] }) {
    const pct = Math.round(prob * 100);
    const fillCls =
        dir === "bull"
            ? "bg-emerald-400"
            : dir === "bear"
            ? "bg-rose-400"
            : "bg-cyan-400";
    return (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/8">
            <div
                className={`h-full rounded-full ${fillCls} opacity-70 transition-all duration-500`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

export function PaperbotSignalBox({ signal, settings, compact }: Props) {
    const sub = compact ? undefined : "Reversal Radar · forward режим · +4H";
    return (
        <Card
            className={`border-emerald-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] ${compact ? "flex h-full min-h-0 flex-col p-3" : ""}`}
            title="Текущий сигнал"
            subtitle={sub}
            padded={!compact}
        >
            {signal === null ? (
                <div
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-black/25 text-center ${
                        compact ? "min-h-[120px] flex-1 px-2 py-4" : "px-4 py-7"
                    }`}
                >
                    <Clock className={`text-white/30 ${compact ? "h-4 w-4" : "h-5 w-5"}`} aria-hidden />
                    <p className={`font-medium text-white/50 ${compact ? "text-[11px]" : "text-[12px]"}`}>
                        Ожидание сигнала
                    </p>
                    {!compact && (
                        <p className="max-w-xs text-[11px] leading-relaxed text-white/35">
                            Данные появятся после первого запуска forward-режима (каждые 4 часа автоматически).
                        </p>
                    )}
                </div>
            ) : (
                <div className={`flex min-h-0 flex-1 flex-col ${compact ? "gap-2" : "gap-3"}`}>
                    <div
                        className={`flex min-h-0 items-center gap-2 rounded-xl border ${dirTone(signal.direction).border} ${compact ? "p-2" : "p-3"}`}
                    >
                        <div className={`shrink-0 ${dirTone(signal.direction).text} ${compact ? "scale-90" : ""}`}>
                            <DirIcon d={signal.direction} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div
                                className={`font-bold tracking-tight ${dirTone(signal.direction).text} ${
                                    compact ? "text-[11px]" : "text-[13px]"
                                }`}
                            >
                                {dirLabel(signal.direction)}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span
                                    className={`font-bold tabular-nums ${dirTone(signal.direction).text} ${
                                        compact ? "text-lg" : "text-[22px]"
                                    }`}
                                >
                                    {Math.round(signal.probability * 100)}%
                                </span>
                                {!compact && <ConfBadge c={signal.confidence} />}
                                {compact && (
                                    <span className="text-[10px] tabular-nums text-white/40">
                                        {confShort(signal.confidence)}
                                    </span>
                                )}
                            </div>
                            <ProbBar prob={signal.probability} dir={signal.direction} />
                        </div>
                    </div>

                    {(() => {
                        const ok = meetsThreshold(signal, settings);
                        const threshLine = `${confShort(settings.minConfidence)} · ${settings.minProbabilityPct}%`;
                        return (
                            <div
                                className={`flex items-center gap-2 rounded-lg border ${compact ? "px-2 py-1.5" : "px-3 py-2.5"} ${
                                    ok
                                        ? "border-emerald-500/20 bg-emerald-500/[0.07]"
                                        : "border-white/8 bg-white/[0.02]"
                                }`}
                            >
                                <div
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                        ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-white/20"
                                    }`}
                                />
                                <div className="min-w-0 flex-1">
                                    {compact ? (
                                        <div className="flex flex-wrap items-baseline justify-between gap-1">
                                            <span
                                                className={`text-[10px] font-semibold ${ok ? "text-emerald-300" : "text-white/45"}`}
                                            >
                                                {ok ? "OK" : "Порог"}
                                            </span>
                                            <span className="text-[10px] tabular-nums text-white/40">{threshLine}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div
                                                className={`text-[11px] font-semibold ${ok ? "text-emerald-300" : "text-white/45"}`}
                                            >
                                                {ok ? "Сигнал проходит фильтры" : "Ниже порога — сделка не открывается"}
                                            </div>
                                            <div className="text-[10px] text-white/35">
                                                {ok
                                                    ? `→ ${signal.direction === "bull" ? "LONG" : "SHORT"} при активации бота`
                                                    : `Мин. уверенность: ${settings.minConfidence.toUpperCase()} · Мин. вероятность: ${settings.minProbabilityPct}%`}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    <div
                        className={`text-right tabular-nums text-white/28 ${compact ? "mt-auto text-[9px]" : "text-[10px]"}`}
                    >
                        {new Date(signal.updatedAt).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </div>

                    <CandidatesSection compact={compact} />
                </div>
            )}
        </Card>
    );
}
