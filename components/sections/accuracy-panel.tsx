"use client";

import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, AlertTriangle, RefreshCw, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { getHtfHistory, type HtfSnapshot } from "@/lib/api";

// ── Accuracy tab types ─────────────────────────────────────────────────────

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

// ── Accuracy tab components ────────────────────────────────────────────────

function WinRateBar({ label, value, avg }: { label: string; value: number; avg: number }) {
    const isGood = value >= 55;
    const isOk   = value >= 50;
    const color  = isGood ? "bg-emerald-500" : isOk ? "bg-amber-500" : "bg-rose-500";
    const textColor = isGood ? "text-emerald-400" : isOk ? "text-amber-400" : "text-rose-400";
    return (
        <div className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-right text-[11px] text-white/40">{label}</span>
            <div className="relative h-1.5 flex-1 rounded-full bg-white/8">
                <div className={`absolute left-0 top-0 h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
                <div className="absolute left-[50%] top-[-2px] h-[10px] w-px bg-white/20" />
            </div>
            <span className={`w-12 text-right text-sm font-semibold tabular-nums ${textColor}`}>{value.toFixed(1)}%</span>
            <span className="w-16 text-right text-[10px] text-white/30 tabular-nums">{avg >= 0 ? "+" : ""}{avg.toFixed(2)}%</span>
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

// ── HTF Snapshot tab components ────────────────────────────────────────────

const BIAS_RU: Record<string, string> = {
    bullish: "Бычий", bearish: "Медвежий", range: "Диапазон", transition: "Переход",
};
const BIAS_COLOR: Record<string, string> = {
    bullish: "text-emerald-400", bearish: "text-rose-400", range: "text-violet-400", transition: "text-amber-400",
};
const CTX_RU: Record<string, string> = {
    favorable: "Благоприятный", neutral: "Нейтральный", unfavorable: "Неблагоприятный",
};
const CTX_COLOR: Record<string, string> = {
    favorable: "text-emerald-400", neutral: "text-slate-400", unfavorable: "text-rose-400",
};
const REGIME_RU: Record<string, string> = {
    strong_uptrend: "Сильный рост", weak_uptrend: "Восходящий", neutral: "Нейтральный",
    downtrend: "Нисходящий", overheated: "Перегрев", unknown: "Неизвестно",
};

function fmtPrice(v: number | null): string {
    if (v == null) return "—";
    return "$" + Math.round(v).toLocaleString("ru-RU");
}

function fmtDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function SnapshotRow({ s }: { s: HtfSnapshot }) {
    const bias = s.macro_bias ?? "—";
    const ctx  = s.long_context ?? "—";
    const reg  = s.trend_regime ?? "—";
    return (
        <div className="grid grid-cols-[90px_1fr] gap-x-3 border-b border-white/5 py-2 last:border-0 text-[11px]">
            {/* Timestamp */}
            <span className="text-white/35 tabular-nums pt-0.5">{fmtDate(s.created_at)}</span>

            <div className="flex flex-col gap-1">
                {/* Row 1: bias + context + regime */}
                <div className="flex flex-wrap gap-2 items-center">
                    <span className={`font-semibold ${BIAS_COLOR[bias] ?? "text-white/50"}`}>
                        {BIAS_RU[bias] ?? bias}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className={CTX_COLOR[ctx] ?? "text-white/50"}>
                        {CTX_RU[ctx] ?? ctx}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-white/50">{REGIME_RU[reg] ?? reg}</span>
                </div>

                {/* Row 2: levels + range */}
                <div className="flex flex-wrap gap-3 text-[10px] text-white/30">
                    {s.nearest_support != null && (
                        <span>Поддержка <span className="text-white/50">{fmtPrice(s.nearest_support)}</span></span>
                    )}
                    {s.nearest_resistance != null && (
                        <span>Сопр. <span className="text-white/50">{fmtPrice(s.nearest_resistance)}</span></span>
                    )}
                    {s.week_range_used_pct != null && (
                        <span>Нед. диапазон <span className="text-white/50">{s.week_range_used_pct.toFixed(0)}%</span></span>
                    )}
                </div>
            </div>
        </div>
    );
}

function HtfHistoryTab() {
    const { data, loading, error } = useApi(getHtfHistory, [], { intervalMs: 6 * 60 * 60 * 1000 });

    if (loading && !data) {
        return (
            <div className="flex h-24 items-center justify-center text-[11px] text-white/30">
                загрузка…
            </div>
        );
    }
    if (error) {
        return (
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
            </div>
        );
    }
    if (!data || data.snapshots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Clock className="h-5 w-5 text-white/20" />
                <p className="text-[11px] text-white/30">
                    Снапшоты появятся после первого пересчёта HTF контекста
                </p>
                <p className="text-[10px] text-white/20">Движок пересчитывается каждые 6 часов</p>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto max-h-[340px] pr-1">
            <div className="mb-2 text-[10px] text-white/25 tabular-nums">
                {data.count} {data.count === 1 ? "снапшот" : data.count < 5 ? "снапшота" : "снапшотов"} · каждые 6 часов
            </div>
            {data.snapshots.map((s) => (
                <SnapshotRow key={s.id} s={s} />
            ))}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

type Tab = "accuracy" | "htf";

export function AccuracyPanel() {
    const [tab, setTab] = useState<Tab>("accuracy");
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
        ? new Date(data.generated_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })
        : null;

    return (
        <Card className="border-white/8 bg-[#0E1117]/80 p-5">
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <BarChart2 className="h-4 w-4 text-sky-400" />
                    {/* Tabs */}
                    <div className="flex gap-1">
                        {(["accuracy", "htf"] as Tab[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                                    tab === t
                                        ? "bg-white/10 text-white"
                                        : "text-white/35 hover:text-white/60"
                                }`}
                            >
                                {t === "accuracy" ? "Точность движка" : "Статистика HTF"}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {tab === "accuracy" && updatedAt && (
                        <span className="text-[10px] text-white/30">{updatedAt}</span>
                    )}
                    {tab === "accuracy" && (
                        <button onClick={load} className="rounded p-1 text-white/30 transition hover:text-white/60" title="Обновить">
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    )}
                    {tab === "accuracy" && data && (
                        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/40">
                            {data.symbol} · {data.days}д
                        </span>
                    )}
                </div>
            </div>

            {/* Accuracy tab */}
            {tab === "accuracy" && (
                <>
                    {loading && (
                        <div className="flex h-24 items-center justify-center text-[11px] text-white/30">загрузка…</div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-[11px] text-rose-400">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
                        </div>
                    )}
                    {data && !loading && (
                        <div className="flex flex-col gap-5">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <StatChip label="Сигналов" value={data.stats.total_signals} />
                                <StatChip label="Нейтральных" value={data.stats.neutral_count} />
                                <StatChip label="Bull / Bear" value={`${data.stats.direction_counts.bull} / ${data.stats.direction_counts.bear}`} />
                                <StatChip label="Макс. серия убытков" value={data.stats.max_consecutive_losses} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="mb-1.5 flex items-center gap-1.5">
                                    <TrendingUp className="h-3.5 w-3.5 text-white/30" />
                                    <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">Win rate по горизонту</span>
                                    <span className="text-[10px] text-white/20">· avg aligned move →</span>
                                </div>
                                {Object.entries(data.stats.win_rates).map(([label, value]) => (
                                    <WinRateBar key={label} label={label} value={value} avg={data.stats.avg_aligned_move_pcts[label] ?? 0} />
                                ))}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] uppercase tracking-[0.12em] text-white/35">По уверенности</span>
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
                                        const labels: Record<string, string> = { high: "высокая", medium: "средняя", low: "низкая" };
                                        return (
                                            <div key={c} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-2 py-2 ${col}`}>
                                                <span className="text-base font-semibold tabular-nums">{cnt}</span>
                                                <span className="text-[10px] opacity-70">{labels[c]}</span>
                                                <span className="text-[10px] opacity-50">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {(() => {
                                const hcKey = Object.keys(data.stats).find((k) => k.startsWith("win_rate_high_conf"));
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
                </>
            )}

            {/* HTF history tab */}
            {tab === "htf" && <HtfHistoryTab />}
        </Card>
    );
}
