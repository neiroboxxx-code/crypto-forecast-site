"use client";

import { useState } from "react";
import { useDashboardData } from "@/components/providers/dashboard-data-provider";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import type { HtfContext } from "@/lib/api";

// ── helpers ────────────────────────────────────────────────────────────────

type RegimeCfg = { label: string; icon: string; color: string; bg: string; border: string };

function regimeCfg(regime: HtfContext["trend_regime"]): RegimeCfg {
    switch (regime) {
        case "strong_uptrend":
            return {
                label: "STRONG UP",
                icon: "↑↑",
                color: "#34d399",
                bg: "rgba(52,211,153,0.08)",
                border: "rgba(52,211,153,0.22)",
            };
        case "weak_uptrend":
            return {
                label: "UPTREND",
                icon: "↑",
                color: "#86efac",
                bg: "rgba(134,239,172,0.07)",
                border: "rgba(134,239,172,0.20)",
            };
        case "neutral":
            return {
                label: "NEUTRAL",
                icon: "→",
                color: "#94a3b8",
                bg: "rgba(148,163,184,0.07)",
                border: "rgba(148,163,184,0.18)",
            };
        case "downtrend":
            return {
                label: "DOWNTREND",
                icon: "↓",
                color: "#f87171",
                bg: "rgba(248,113,113,0.08)",
                border: "rgba(248,113,113,0.22)",
            };
        case "overheated":
            return {
                label: "OVERHEATED",
                icon: "⚠",
                color: "#fb923c",
                bg: "rgba(251,146,60,0.07)",
                border: "rgba(251,146,60,0.20)",
            };
        default:
            return {
                label: "—",
                icon: "·",
                color: "#6b7280",
                bg: "rgba(107,114,128,0.07)",
                border: "rgba(107,114,128,0.18)",
            };
    }
}

function biasCfg(bias: HtfContext["macro_bias"]): { label: string; color: string } {
    switch (bias) {
        case "bullish":    return { label: "BULLISH",  color: "#34d399" };
        case "bearish":    return { label: "BEARISH",  color: "#f87171" };
        case "range":      return { label: "SIDEWAYS", color: "#a78bfa" };
        case "transition": return { label: "TRANSIT",  color: "#fbbf24" };
        default:           return { label: "—",        color: "#6b7280" };
    }
}

function rangeColor(status: string | null | undefined): string {
    switch (status) {
        case "fresh":     return "#34d399";
        case "normal":    return "#22d3ee";
        case "extended":  return "#fbbf24";
        case "exhausted": return "#f87171";
        default:          return "#6b7280";
    }
}

function updatedAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const h  = Math.floor(ms / 3_600_000);
    const m  = Math.floor((ms % 3_600_000) / 60_000);
    if (h >= 1) return `${h}h ${m}m ago`;
    return `${m}m ago`;
}

// ── component ──────────────────────────────────────────────────────────────

export function HtfMarketContext() {
    const { htf } = useDashboardData();
    const { data, loading, error } = htf;
    const [infoOpen, setInfoOpen] = useState(false);

    const openInfo = () => setInfoOpen(true);
    const onKeyActivate = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openInfo();
        }
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={openInfo}
                onKeyDown={onKeyActivate}
                aria-label="Показать пояснение к HTF Context"
                className="group cursor-pointer rounded-2xl outline-none transition hover:ring-1 hover:ring-white/10 focus-visible:ring-1 focus-visible:ring-cyan-400/50"
            >
                <Card
                    title="HTF Context"
                    subtitle="Multi-Week Horizon"
                    right={<InfoIconButton onClick={openInfo} label="Показать пояснение" interactive={false} />}
                >
                    {loading && (
                        <div className="space-y-3">
                            <Skeleton className="h-14 w-full" />
                            <div className="grid grid-cols-2 gap-2">
                                <Skeleton className="h-16" />
                                <Skeleton className="h-16" />
                            </div>
                            <Skeleton className="h-3 w-1/2 ml-auto" />
                        </div>
                    )}

                    {error && !loading && <ErrorState message={error} />}

                    {data && !loading && (() => {
                        const rc          = regimeCfg(data.trend_regime);
                        const bc          = biasCfg(data.macro_bias);
                        const atr         = data.atr_context;
                        const rangePct    = atr?.week_range_used_pct ?? null;
                        const rangeStatus = atr?.weekly_range_status ?? null;
                        const fill        = Math.min(100, Math.max(0, rangePct ?? 0));
                        const rColor      = rangeColor(rangeStatus);

                        return (
                            <div className="space-y-2.5">

                                {/* ── main regime badge ── */}
                                <div
                                    className="rounded-lg p-3 text-center"
                                    style={{ background: rc.bg, border: `1px solid ${rc.border}` }}
                                >
                                    <div className="text-2xl font-bold tracking-tight" style={{ color: rc.color }}>
                                        {rc.icon}&nbsp;{rc.label}
                                    </div>
                                    <div
                                        className="mt-0.5 text-[10px] uppercase tracking-[0.18em]"
                                        style={{ color: `${rc.color}99` }}
                                    >
                                        Weekly Trend Regime
                                    </div>
                                </div>

                                {/* ── 2-col: bias + range ── */}
                                <div className="grid grid-cols-2 gap-2">

                                    {/* weekly bias */}
                                    <div className="rounded-lg border border-white/8 bg-black/30 p-2.5">
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-2">
                                            Weekly Bias
                                        </div>
                                        <div className="text-base font-semibold" style={{ color: bc.color }}>
                                            {bc.label}
                                        </div>
                                    </div>

                                    {/* week range used */}
                                    <div className="rounded-lg border border-white/8 bg-black/30 p-2.5">
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40 mb-2">
                                            Week Range
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${fill}%`, backgroundColor: rColor }}
                                                />
                                            </div>
                                            <span
                                                className="text-[11px] font-mono tabular-nums shrink-0"
                                                style={{ color: rColor }}
                                            >
                                                {rangePct !== null ? `${rangePct.toFixed(0)}%` : "—"}
                                            </span>
                                        </div>
                                        <div className="text-[10px] capitalize" style={{ color: `${rColor}bb` }}>
                                            {rangeStatus ?? "—"}
                                        </div>
                                    </div>
                                </div>

                                {/* ── footer ── */}
                                <div className="text-[10px] text-white/22 text-right tabular-nums">
                                    {updatedAgo(data.updated_at)}&nbsp;·&nbsp;6h cache
                                </div>

                            </div>
                        );
                    })()}
                </Card>
            </div>

            <InfoDialog
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                title="HTF Context"
                subtitle="Общая картина рынка на недельном горизонте"
            >
                <p>
                    Показывает, в каком состоянии находится рынок на масштабе нескольких недель.
                    Это <strong>не торговый сигнал</strong> — блок помогает дейтрейдеру понять
                    старший контекст: торгуешь по тренду или против, насколько рынок растянулся
                    за неделю.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Weekly Trend Regime
                </h4>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-5">
                    <li>
                        <span className="font-semibold text-emerald-400">↑↑ STRONG UP</span> —
                        выраженный восходящий тренд: чёткие Higher Highs + Higher Lows,
                        бычья структура не нарушена.
                    </li>
                    <li>
                        <span className="font-semibold" style={{ color: "#86efac" }}>↑ UPTREND</span> —
                        умеренный восходящий тренд. Структура бычья, но без ускорения.
                    </li>
                    <li>
                        <span className="font-semibold text-slate-400">→ NEUTRAL</span> —
                        боковик или переходная зона: тренд не выражен, рынок консолидируется.
                    </li>
                    <li>
                        <span className="font-semibold text-rose-400">↓ DOWNTREND</span> —
                        нисходящий тренд: Lower Highs + Lower Lows, медвежья структура.
                    </li>
                    <li>
                        <span className="font-semibold text-orange-400">⚠ OVERHEATED</span> —
                        рынок сильно перегрет: бычий тренд, но недельный диапазон значительно
                        превышен. Высокий риск резкого отката.
                    </li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Weekly Bias
                </h4>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-5">
                    <li>
                        <span className="font-semibold text-emerald-400">BULLISH</span> —
                        недельная и месячная структура в пользу покупателей: цена выше ключевых уровней,
                        давление вверх.
                    </li>
                    <li>
                        <span className="font-semibold text-rose-400">BEARISH</span> —
                        структура в пользу продавцов: Lower Lows, пробитые поддержки, давление вниз.
                    </li>
                    <li>
                        <span className="font-semibold text-violet-400">SIDEWAYS</span> —
                        рынок в диапазоне без явного направления. Свинги работают,
                        тренда нет.
                    </li>
                    <li>
                        <span className="font-semibold text-amber-400">TRANSIT</span> —
                        переход между режимами: старый тренд сломан, новый ещё не подтверждён.
                    </li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Week Range
                </h4>
                <p className="mt-2 text-[11px] leading-5">
                    Сколько процентов недельного ATR-диапазона уже пройдено с начала текущей недели.
                    Помогает понять, есть ли ещё ход у рынка или диапазон исчерпан.
                </p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-5">
                    <li><span className="font-semibold text-emerald-400">Fresh</span> — &lt;35%: неделя только начинается, много пространства для движения.</li>
                    <li><span className="font-semibold text-cyan-400">Normal</span> — 35–65%: нормальный ход, движение в рамках средней недели.</li>
                    <li><span className="font-semibold text-amber-400">Extended</span> — 65–90%: диапазон значительно пройден, осторожно с входами в направлении тренда.</li>
                    <li><span className="font-semibold text-rose-400">Exhausted</span> — &gt;90%: диапазон исчерпан, высокий риск разворота или паузы до следующей недели.</li>
                </ul>

                <p className="mt-4 text-xs text-white/40">
                    Данные обновляются раз в 6 часов. Это не финансовый совет — только аналитический контекст.
                </p>
            </InfoDialog>
        </>
    );
}
