"use client";

import React, { useState } from "react";
import { type HtfContext, type HtfRiskWarning } from "@/lib/api";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";

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
        case "strong_uptrend": return "STRONG UP";
        case "weak_uptrend":   return "UPTREND";
        case "neutral":        return "NEUTRAL";
        case "downtrend":      return "DOWNTREND";
        case "overheated":     return "OVERHEATED";
        case "unknown":        return "UNKNOWN";
        default:               return "—";
    }
}

function regimeColor(regime: HtfContext["trend_regime"]): string {
    switch (regime) {
        case "strong_uptrend": return "#34d399";
        case "weak_uptrend":   return "#86efac";
        case "neutral":        return "#94a3b8";
        case "downtrend":      return "#f87171";
        case "overheated":     return "#fb923c";
        default:               return "#6b7280";
    }
}

function locationLabel(loc: string | null | undefined): string {
    switch (loc) {
        case "near_resistance": return "NEAR RES";
        case "near_support":    return "NEAR SUP";
        case "mid_range":       return "MID RANGE";
        case "no_levels":       return "NO LEVELS";
        default:                return loc ? loc.replace(/_/g, " ").toUpperCase() : "—";
    }
}

function locationColor(loc: string | null | undefined): string {
    switch (loc) {
        case "near_resistance": return "#f87171";
        case "near_support":    return "#34d399";
        case "mid_range":       return "#94a3b8";
        default:                return "#6b7280";
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

// trend_entry_signal static config (colors/icons only — subtitle is computed dynamically)
function trendSignalConfig(signal: HtfContext["trend_entry_signal"]): {
    label: string; color: string; bg: string; border: string; icon: string;
} {
    switch (signal) {
        case "ready":
            return {
                label: "READY",
                color: "#34d399",
                bg: "rgba(52,211,153,0.07)",
                border: "rgba(52,211,153,0.25)",
                icon: "↑",
            };
        case "wait":
            return {
                label: "WAIT",
                color: "#fbbf24",
                bg: "rgba(251,191,36,0.07)",
                border: "rgba(251,191,36,0.25)",
                icon: "→",
            };
        case "caution":
            return {
                label: "НЕ СЕЙЧАС",
                color: "#fb923c",
                bg: "rgba(251,146,60,0.06)",
                border: "rgba(251,146,60,0.18)",
                icon: "○",
            };
        default:
            return {
                label: "—",
                color: "#6b7280",
                bg: "rgba(107,114,128,0.07)",
                border: "rgba(107,114,128,0.2)",
                icon: "·",
            };
    }
}

// Dynamic subtitle — shows the specific reason, not a generic fallback
function trendSignalSubtitle(signal: HtfContext["trend_entry_signal"], data: HtfContext): string {
    if (signal === "ready") {
        return "Все условия выровнены — можно искать точку входа";
    }
    if (signal === "wait") {
        const loc = data.distance_to_levels?.location;
        const weekPct = data.atr_context?.week_range_used_pct;
        if (loc === "near_resistance") return "Цена у сопротивления — ждём откат или пробой";
        if (weekPct !== null && weekPct !== undefined && weekPct > 65) return "Недельный диапазон почти исчерпан — ждём новой недели";
        return "Бычий макрос, но тренд ещё не подтверждён";
    }
    if (signal === "caution") {
        if (data.macro_bias === "bearish") return "Медвежья структура на недельном ТФ";
        if (data.macro_bias === "transition") return "Переходная структура — новый тренд не подтверждён";
        if (!data.macro_bias) return "Недостаточно данных для анализа";
        const highWarn = data.risk_warnings.find(w => w.severity === "high");
        if (highWarn) return highWarn.message;
        return "Активны предупреждения высокого уровня";
    }
    return "Нет данных";
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

// ── Inner Panel ────────────────────────────────────────────────────────────

function HtfPanelInner({ data }: { data: HtfContext }) {
    const [expanded, setExpanded] = useState(false);

    if (data.status === "insufficient_data") {
        return (
            <div className="text-center py-4 text-sm text-slate-400">
                Недостаточно исторических данных для HTF анализа
            </div>
        );
    }

    const atr  = data.atr_context;
    const ema  = data.daily_ema_context;
    const dist = data.distance_to_levels;
    const sig  = trendSignalConfig(data.trend_entry_signal ?? null);
    const sub  = trendSignalSubtitle(data.trend_entry_signal ?? null, data);

    // Top warning (highest severity, for collapsed view)
    const topWarning = data.risk_warnings.find(w => w.severity === "high")
        ?? data.risk_warnings[0]
        ?? null;

    return (
        <div className="space-y-3">

            {/* ── MAIN SIGNAL BLOCK ── */}
            <div
                className="rounded-lg p-3 text-center"
                style={{ background: sig.bg, border: `1px solid ${sig.border}` }}
            >
                <div className="text-2xl font-bold tracking-widest" style={{ color: sig.color }}>
                    {sig.icon} {sig.label}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em]" style={{ color: `${sig.color}99` }}>
                    Trend Entry Signal
                </div>
                <div className="mt-1 text-[11px] text-white/40">
                    {sub}
                </div>
            </div>

            {/* ── SUMMARY ROW: macro + context + regime + location ── */}
            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/8 bg-black/20 p-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1">Macro</div>
                    <Badge
                        label={data.macro_bias ? data.macro_bias.toUpperCase() : "—"}
                        color={macroBiasColor(data.macro_bias)}
                    />
                </div>
                <div className="rounded-lg border border-white/8 bg-black/20 p-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1">Long Context</div>
                    <Badge
                        label={data.long_context ? data.long_context.toUpperCase() : "—"}
                        color={longContextColor(data.long_context)}
                    />
                </div>
                <div className="rounded-lg border border-white/8 bg-black/20 p-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1">Regime</div>
                    <Badge
                        label={regimeLabel(data.trend_regime)}
                        color={regimeColor(data.trend_regime)}
                    />
                </div>
                <div className="rounded-lg border border-white/8 bg-black/20 p-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-1">Location</div>
                    <Badge
                        label={locationLabel(dist?.location)}
                        color={locationColor(dist?.location)}
                    />
                </div>
            </div>

            {/* ── TOP WARNING (collapsed) ── */}
            {topWarning && !expanded && (
                <div
                    className="flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px]"
                    style={{
                        borderColor: `${severityColor(topWarning.severity)}40`,
                        background: `${severityColor(topWarning.severity)}08`,
                    }}
                >
                    <span
                        className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: severityColor(topWarning.severity), marginTop: "4px" }}
                    />
                    <span className="text-white/60">{topWarning.message}</span>
                </div>
            )}

            {/* ── EXPAND TOGGLE ── */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-white/8 bg-white/3 py-1.5 text-[11px] text-white/35 hover:text-white/55 hover:bg-white/5 transition-colors"
            >
                <span>{expanded ? "↑ Свернуть" : "↓ Подробнее"}</span>
            </button>

            {/* ── EXPANDED "ПОДКАПОТ" ── */}
            {expanded && (
                <div className="space-y-4 pt-1 border-t border-white/6">

                    {/* EMA context */}
                    {ema && (
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-2">EMA Context (Daily)</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-white/5 rounded p-2">
                                    <div className="text-slate-500 mb-0.5">EMA 200</div>
                                    <div className="text-slate-200 font-mono">
                                        {ema.ema_200 ? `$${Math.round(ema.ema_200).toLocaleString()}` : "—"}
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded p-2">
                                    <div className="text-slate-500 mb-0.5">EMA 50</div>
                                    <div className="text-slate-200 font-mono">
                                        {ema.ema_50 ? `$${Math.round(ema.ema_50).toLocaleString()}` : "—"}
                                    </div>
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
                        </div>
                    )}

                    {/* Weekly / Monthly range */}
                    {atr && (
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-2">Range Used</div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs text-slate-500">Weekly</span>
                                    <span className="text-xs" style={{ color: rangeStatusColor(atr.weekly_range_status) }}>
                                        {atr.weekly_range_status ?? "—"}
                                    </span>
                                </div>
                                <RangeBar pct={atr.week_range_used_pct} status={atr.weekly_range_status} />

                                {atr.month_range_used_pct !== null && atr.month_range_used_pct !== undefined && (
                                    <>
                                        <div className="flex items-center justify-between mt-2 mb-0.5">
                                            <span className="text-xs text-slate-500">Monthly</span>
                                        </div>
                                        <RangeBar pct={atr.month_range_used_pct} status={null} />
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Key levels */}
                    {data.key_levels.length > 0 && (
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-2">Key Levels</div>
                            <div className="space-y-1">
                                {data.key_levels.slice(0, 6).map((lv, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between text-xs font-mono"
                                    >
                                        <span
                                            className="font-semibold"
                                            style={{
                                                color: lv.type === "resistance" ? "#f87171"
                                                     : lv.type === "support"    ? "#34d399"
                                                     : "#a78bfa"
                                            }}
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

                    {/* All warnings */}
                    {data.risk_warnings.length > 0 && (
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/35 mb-2">Risk Warnings</div>
                            <div className="space-y-1.5">
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

                    {/* Footer */}
                    <div className="text-xs text-slate-600 pt-1 border-t border-white/5">
                        {data.cached && <span className="mr-2 text-amber-600/70">cached</span>}
                        {data.updated_at && (
                            <span>
                                updated {new Date(data.updated_at).toLocaleTimeString("ru-RU", {
                                    hour: "2-digit", minute: "2-digit",
                                })}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Public Export ──────────────────────────────────────────────────────────

export function HtfContextPanel({ symbol = "BTCUSDT" }: { symbol?: string }) {
    const { htf } = useDashboardData();
    const { data, loading, error } = htf;
    const [infoOpen, setInfoOpen] = useState(false);

    return (
        <>
            <section className="rounded-xl border border-white/10 bg-[#0d1117] p-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-slate-200 tracking-wide">
                        HTF Context
                        <span className="ml-2 text-xs text-slate-500 font-normal">1W / 1M</span>
                    </h2>
                    <div className="flex items-center gap-2">
                        {data && !loading && (
                            <span className="text-xs text-slate-500">{symbol}</span>
                        )}
                        <InfoIconButton
                            onClick={() => setInfoOpen(true)}
                            label="Показать пояснение к HTF Context"
                        />
                    </div>
                </div>

                {loading && (
                    <div className="space-y-3">
                        <div className="h-20 rounded-lg bg-white/5 animate-pulse" />
                        <div className="grid grid-cols-2 gap-2">
                            {[1,2,3,4].map(i => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <div className="text-xs text-rose-400 py-2">HTF данные недоступны</div>
                )}

                {data && !loading && <HtfPanelInner data={data} />}
            </section>

            <InfoDialog
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                title="HTF Context"
                subtitle="Позиционирование на старших таймфреймах (1W / 1M)"
            >
                <p>
                    Инструмент трендовой торговли на горизонте 1–4 недели. Агрегирует недельную
                    структуру рынка, ключевые уровни, EMA-режим и диапазон недели/месяца
                    в один сигнал. Данные обновляются раз в 6 часов.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Trend Entry Signal
                </h4>
                <ul className="mt-2 space-y-1.5">
                    <li><span className="font-semibold text-emerald-400">READY</span> — все условия выровнены: бычий макрос, благоприятный контекст, нет HIGH-предупреждений, диапазон не исчерпан, цена не у сопротивления. Можно искать вход в тренд.</li>
                    <li><span className="font-semibold text-amber-400">WAIT</span> — бычий макрос, но не все условия подтверждены. Стратегия — ждать улучшения условий (откат к поддержке, свежая неделя).</li>
                    <li><span className="font-semibold text-orange-400">НЕ СЕЙЧАС</span> — медвежий/переходный макрос или HIGH-предупреждение. Условия не выровнены, вход в тренд пропускается.</li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Macro Bias / Long Context
                </h4>
                <ul className="mt-2 space-y-1.5">
                    <li><span className="font-semibold text-emerald-400">Macro Bullish</span> — недельная структура: Higher Highs + Higher Lows.</li>
                    <li><span className="font-semibold text-emerald-400">Long Context Favorable</span> — подтверждённый uptrend (strong или weak), без критических ограничений.</li>
                    <li><span className="font-semibold text-slate-400">Neutral</span> — макрос бычий, но тренд ещё не подтверждён или есть ограничения.</li>
                    <li><span className="font-semibold text-rose-400">Caution/Unfavorable</span> — структура медвежья или переходная.</li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Подробности (↓ Подробнее)
                </h4>
                <p className="mt-2">
                    Кнопка «Подробнее» раскрывает «подкапот»: EMA 200/50 в цифрах, прогресс
                    недельного и месячного диапазона, ключевые уровни с расстоянием в ATR,
                    все предупреждения. Это для анализа — основной сигнал в верхней части.
                </p>

                <p className="mt-3 text-xs text-white/50">
                    Это не финансовый совет. Сигнал — один из инструментов анализа.
                </p>
            </InfoDialog>
        </>
    );
}
