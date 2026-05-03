"use client";

import React from "react";
import { fetchHtfContext, type HtfContext, type HtfRiskWarning } from "@/lib/api";
import { useApi } from "@/hooks/use-api";

// ── Helpers ────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
    return (
        <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
        >
            {label}
        </span>
    );
}

function macroBiasColor(bias: HtfContext["macro_bias"]): string {
    switch (bias) {
        case "bullish":    return "#34d399";
        case "bearish":    return "#f87171";
        case "transition": return "#fbbf24";
        case "range":      return "#a78bfa";
        default:           return "#6b7280";
    }
}

function longContextColor(ctx: HtfContext["long_context"]): string {
    switch (ctx) {
        case "favorable":   return "#34d399";
        case "unfavorable": return "#f87171";
        case "neutral":     return "#94a3b8";
        default:            return "#6b7280";
    }
}

function regimeLabel(regime: HtfContext["trend_regime"]): string {
    switch (regime) {
        case "strong_uptrend": return "Strong Uptrend ↑↑";
        case "weak_uptrend":   return "Uptrend ↑";
        case "neutral":        return "Neutral ↔";
        case "downtrend":      return "Downtrend ↓";
        case "overheated":     return "Overheated 🔥";
        case "unknown":        return "Unknown";
        default:               return "—";
    }
}

function rangeStatusColor(status: string | null | undefined): string {
    switch (status) {
        case "fresh":     return "#34d399";
        case "normal":    return "#22d3ee";
        case "extended":  return "#fbbf24";
        case "exhausted": return "#f87171";
        default:          return "#6b7280";
    }
}

function severityColor(severity: HtfRiskWarning["severity"]): string {
    switch (severity) {
        case "high":   return "#f87171";
        case "medium": return "#fbbf24";
        case "low":    return "#94a3b8";
    }
}

function RangeBar({ pct, status }: { pct: number | null | undefined; status: string | null | undefined }) {
    const fill = Math.min(100, Math.max(0, pct ?? 0));
    const color = rangeStatusColor(status);
    return (
        <div className="flex items-center gap-2 w-full">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${fill}%`, backgroundColor: color }}
                />
            </div>
            <span className="text-xs font-mono w-12 text-right" style={{ color }}>
                {pct !== null && pct !== undefined ? `${pct.toFixed(0)}%` : "—"}
            </span>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────

function HtfPanelInner({ data }: { data: HtfContext }) {
    if (data.status === "insufficient_data") {
        return (
            <div className="text-center py-4 text-sm text-slate-400">
                Недостаточно исторических данных для HTF анализа
            </div>
        );
    }

    const atr = data.atr_context;
    const ema = data.daily_ema_context;
    const dist = data.distance_to_levels;

    return (
        <div className="space-y-4">
            {/* Row 1: macro_bias + long_context */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Macro Bias</span>
                    <Badge
                        label={data.macro_bias ? data.macro_bias.toUpperCase() : "UNKNOWN"}
                        color={macroBiasColor(data.macro_bias)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Long Context</span>
                    <Badge
                        label={data.long_context ? data.long_context.toUpperCase() : "UNKNOWN"}
                        color={longContextColor(data.long_context)}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Trend Regime</span>
                    <span className="text-sm font-medium text-slate-200">
                        {regimeLabel(data.trend_regime)}
                    </span>
                </div>
                {dist && (
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Location</span>
                        <span className="text-sm text-slate-300">
                            {dist.location?.replace(/_/g, " ")}
                        </span>
                    </div>
                )}
            </div>

            {/* Row 2: EMA context */}
            {ema && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white/5 rounded p-2">
                        <div className="text-slate-500 mb-0.5">EMA 200</div>
                        <div className="text-slate-200 font-mono">{ema.ema_200 ? `$${ema.ema_200.toLocaleString()}` : "—"}</div>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <div className="text-slate-500 mb-0.5">EMA 50</div>
                        <div className="text-slate-200 font-mono">{ema.ema_50 ? `$${ema.ema_50.toLocaleString()}` : "—"}</div>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <div className="text-slate-500 mb-0.5">Dist from 200</div>
                        <div
                            className="font-mono"
                            style={{ color: (ema.distance_from_200ema_pct ?? 0) >= 0 ? "#34d399" : "#f87171" }}
                        >
                            {ema.distance_from_200ema_pct !== null && ema.distance_from_200ema_pct !== undefined
                                ? `${ema.distance_from_200ema_pct > 0 ? "+" : ""}${ema.distance_from_200ema_pct.toFixed(1)}%`
                                : "—"}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded p-2">
                        <div className="text-slate-500 mb-0.5">EMA 200 slope</div>
                        <div className="text-slate-200">{ema.ema_200_slope ?? "—"}</div>
                    </div>
                </div>
            )}

            {/* Row 3: Weekly / Monthly range */}
            {atr && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Weekly range</span>
                        <span className="text-xs" style={{ color: rangeStatusColor(atr.weekly_range_status) }}>
                            {atr.weekly_range_status ?? "—"}
                        </span>
                    </div>
                    <RangeBar pct={atr.week_range_used_pct} status={atr.weekly_range_status} />

                    {atr.month_range_used_pct !== null && atr.month_range_used_pct !== undefined && (
                        <>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-slate-500">Monthly range</span>
                            </div>
                            <RangeBar pct={atr.month_range_used_pct} status={null} />
                        </>
                    )}
                </div>
            )}

            {/* Row 4: Key levels */}
            {data.key_levels.length > 0 && (
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Key Levels</div>
                    <div className="space-y-1">
                        {data.key_levels.slice(0, 5).map((lv, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between text-xs font-mono"
                            >
                                <span
                                    className="font-semibold"
                                    style={{ color: lv.type === "resistance" ? "#f87171" : lv.type === "support" ? "#34d399" : "#a78bfa" }}
                                >
                                    ${lv.price.toLocaleString()}
                                </span>
                                <span className="text-slate-500">{lv.source.replace(/_/g, " ")}</span>
                                <span className="text-slate-400">{lv.distance_atr.toFixed(1)} ATR</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Row 5: Risk warnings */}
            {data.risk_warnings.length > 0 && (
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-1.5">Risk Warnings</div>
                    <div className="space-y-1">
                        {data.risk_warnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                                <span
                                    className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: severityColor(w.severity), marginTop: "4px" }}
                                />
                                <span className="text-slate-300">{w.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer: freshness */}
            <div className="text-xs text-slate-600 pt-1 border-t border-white/5">
                {data.cached && <span className="mr-2 text-amber-600">cached</span>}
                {data.updated_at && (
                    <span>
                        updated {new Date(data.updated_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                )}
            </div>
        </div>
    );
}

export function HtfContextPanel({ symbol = "BTCUSDT" }: { symbol?: string }) {
    const { data, loading, error } = useApi(() => fetchHtfContext(symbol), [symbol], {
        intervalMs: 6 * 60 * 60 * 1000,  // refresh every 6H (matches cache TTL)
    });

    return (
        <section className="rounded-xl border border-white/10 bg-[#0d1117] p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-200 tracking-wide">
                    HTF Context
                    <span className="ml-2 text-xs text-slate-500 font-normal">1W / 1M</span>
                </h2>
                {data && !loading && (
                    <span className="text-xs text-slate-500">{symbol}</span>
                )}
            </div>

            {loading && (
                <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-4 rounded bg-white/5 animate-pulse" />
                    ))}
                </div>
            )}

            {error && !loading && (
                <div className="text-xs text-rose-400 py-2">
                    HTF данные недоступны
                </div>
            )}

            {data && !loading && <HtfPanelInner data={data} />}
        </section>
    );
}
