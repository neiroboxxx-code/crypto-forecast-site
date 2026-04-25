import { ArrowUpRight, ArrowDownRight, Minus, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaperSignalState, PaperSettings } from "@/components/sections/paperbot/types";

type Props = {
    signal: PaperSignalState | null;
    settings: PaperSettings;
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

export function PaperbotSignalBox({ signal, settings }: Props) {
    return (
        <Card
            className="border-emerald-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
            title="Текущий сигнал"
            subtitle="Reversal Radar · forward режим · +4H"
        >
            {signal === null ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 bg-black/25 px-4 py-7 text-center">
                    <Clock className="h-5 w-5 text-white/30" aria-hidden />
                    <p className="text-[12px] font-medium text-white/50">Ожидание сигнала</p>
                    <p className="max-w-xs text-[11px] leading-relaxed text-white/35">
                        Данные появятся после первого запуска forward-режима (каждые 4 часа автоматически).
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {/* Direction + probability */}
                    <div className={`flex items-center gap-3 rounded-xl border p-3 ${dirTone(signal.direction).border}`}>
                        <div className={`${dirTone(signal.direction).text}`}>
                            <DirIcon d={signal.direction} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-[13px] font-bold tracking-tight ${dirTone(signal.direction).text}`}>
                                {dirLabel(signal.direction)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                                <span className={`text-[22px] font-bold tabular-nums ${dirTone(signal.direction).text}`}>
                                    {Math.round(signal.probability * 100)}%
                                </span>
                                <ConfBadge c={signal.confidence} />
                            </div>
                            <ProbBar prob={signal.probability} dir={signal.direction} />
                        </div>
                    </div>

                    {/* Bot action */}
                    {(() => {
                        const ok = meetsThreshold(signal, settings);
                        return (
                            <div
                                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                                    ok
                                        ? "border-emerald-500/20 bg-emerald-500/[0.07]"
                                        : "border-white/8 bg-white/[0.02]"
                                }`}
                            >
                                <div
                                    className={`h-2 w-2 shrink-0 rounded-full ${
                                        ok ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-white/20"
                                    }`}
                                />
                                <div>
                                    <div className={`text-[11px] font-semibold ${ok ? "text-emerald-300" : "text-white/45"}`}>
                                        {ok ? "Сигнал проходит фильтры" : "Ниже порога — сделка не открывается"}
                                    </div>
                                    <div className="text-[10px] text-white/35">
                                        {ok
                                            ? `→ ${signal.direction === "bull" ? "LONG" : "SHORT"} при активации бота`
                                            : `Мин. уверенность: ${settings.minConfidence.toUpperCase()} · Мин. вероятность: ${settings.minProbabilityPct}%`}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Timestamp */}
                    <div className="text-right text-[10px] tabular-nums text-white/28">
                        обновлено{" "}
                        {new Date(signal.updatedAt).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </div>
                </div>
            )}
        </Card>
    );
}
