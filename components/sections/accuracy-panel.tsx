"use client";

import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";

interface BacktestStats {
    total_eval_points: number;
    total_signals: number;
    neutral_count: number;
    signal_rate_pct: number;
    direction_counts: { bull: number; bear: number };
    confidence_counts: { high: number; medium: number; low: number };
    win_rates: Record<string, number>;
    avg_aligned_move_pcts: Record<string, number>;
    max_consecutive_losses: number;
    [key: string]: unknown;
}

interface BacktestData {
    symbol: string;
    days: number;
    generated_at: string;
    stats: BacktestStats;
    error?: string;
}

function WinRateBar({ label, value, avg }: { label: string; value: number; avg: number }) {
    const isGood = value >= 55;
    const isOk   = value >= 50;
    const color  = isGood ? "bg-emerald-500" : isOk ? "bg-amber-500" : "bg-rose-500";
    const textColor = isGood ? "text-emerald-400" : isOk ? "text-amber-400" : "text-rose-400";

    return (
        <div className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-right text-[11px] text-white/40">{label}</span>
            <div className="relative h-1.5 flex-1 rounded-full bg-white/8">
                <div
                    className={`absolute left-0 top-0 h-full rounded-full ${color}`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                />
                {/* 50% marker */}
                <div className="absolute left-[50%] top-[-2px] h-[10px] w-px bg-white/20" />
            </div>
            <span className={`w-12 text-right text-sm font-semibold tabular-nums ${textColor}`}>
                {value.toFixed(1)}%
            </span>
            <span className="w-16 text-right text-[10px] text-white/30 tabular-nums">
                {avg >= 0 ? "+" : ""}{avg.toFixed(2)}%
            </span>
        </div>
    );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex flex-col gap-0.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">{label}</span>
            <span className="text-base font-semibold text-white">{value}</span>
        </div>
    );
}

export function AccuracyPanel() {
    const [data, setData] = useState<BacktestData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/backtest");
            if (!res.ok) throw new Error(`${res.status}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (e) {
            setError(e instanceof Error ? e.message : "unknown error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const updatedAt = data?.generated_at
        ? new Date(data.generated_at).toLocaleDateString("ru-RU", {
              day: "2-digit", month: "short", year: "numeric",
          })
        : null;

    return (
        <Card className="border-white/8 bg-[#0E1117]/80 p-5">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <BarChart2 className="h-4 w-4 text-sky-400" />
                    <span className="text-sm font-semibold text-white">Точность движка</span>
                    {data && (
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40">
                            {data.symbol} · {data.days}д
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {updatedAt && (
                        <span className="text-[10px] text-white/30">{updatedAt}</span>
                    )}
                    <button
                        onClick={load}
                        className="rounded p-1 text-white/30 transition hover:text-white/60"
                        title="Обновить"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex h-24 items-center justify-center text-[11px] text-white/30">
                    загрузка…
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                </div>
            )}

            {data && !loading && (
                <div className="flex flex-col gap-5">
                    {/* Stat chips */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatChip label="Сигналов" value={data.stats.total_signals} />
                        <StatChip label="Нейтральных" value={data.stats.neutral_count} />
                        <StatChip
                            label="Bull / Bear"
                            value={`${data.stats.direction_counts.bull} / ${data.stats.direction_counts.bear}`}
                        />
                        <StatChip
                            label="Макс. серия убытков"
                            value={data.stats.max_consecutive_losses}
                        />
                    </div>

                    {/* Win rates */}
                    <div className="flex flex-col gap-1">
                        <div className="mb-1.5 flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-white/30" />
                            <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                                Win rate по горизонту
                            </span>
                            <span className="text-[10px] text-white/20">· avg aligned move →</span>
                        </div>
                        {Object.entries(data.stats.win_rates).map(([label, value]) => (
                            <WinRateBar
                                key={label}
                                label={label}
                                value={value}
                                avg={data.stats.avg_aligned_move_pcts[label] ?? 0}
                            />
                        ))}
                    </div>

                    {/* Confidence breakdown */}
                    <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                            По уверенности
                        </span>
                        <div className="flex gap-2">
                            {(["high", "medium", "low"] as const).map((c) => {
                                const cnt   = data.stats.confidence_counts[c] ?? 0;
                                const total = data.stats.total_signals || 1;
                                const pct   = (cnt / total * 100).toFixed(0);
                                const col   = c === "high"
                                    ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/5"
                                    : c === "medium"
                                    ? "text-amber-400 border-amber-500/25 bg-amber-500/5"
                                    : "text-white/40 border-white/10 bg-white/[0.02]";
                                const labels: Record<string, string> = {
                                    high: "высокая", medium: "средняя", low: "низкая",
                                };
                                return (
                                    <div
                                        key={c}
                                        className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-2 py-2 ${col}`}
                                    >
                                        <span className="text-base font-semibold tabular-nums">{cnt}</span>
                                        <span className="text-[10px] opacity-70">{labels[c]}</span>
                                        <span className="text-[10px] opacity-50">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* High-confidence win rate callout */}
                    {(() => {
                        const hcKey = Object.keys(data.stats).find(
                            (k) => k.startsWith("win_rate_high_conf"),
                        );
                        const hcVal = hcKey ? (data.stats[hcKey] as number | null) : null;
                        if (!hcVal) return null;
                        const hcLabel = hcKey!.replace("win_rate_high_conf_", "").replace("_", " ");
                        return (
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-400">
                                High-confidence сигналы ({hcLabel}): <strong>{hcVal}%</strong> win rate
                            </div>
                        );
                    })()}
                </div>
            )}
        </Card>
    );
}
