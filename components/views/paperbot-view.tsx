"use client";

import { Bot, ChevronRight } from "lucide-react";
import { getPaperbotState, type PaperBotState } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { PaperbotSummary } from "@/components/sections/paperbot/paperbot-summary";
import { PaperbotPositionsTable } from "@/components/sections/paperbot/paperbot-positions-table";
import { PaperbotClosedTrades } from "@/components/sections/paperbot/paperbot-closed-trades";
import { PaperbotActivityLog } from "@/components/sections/paperbot/paperbot-activity-log";
import { PaperbotSignalBox } from "@/components/sections/paperbot/paperbot-signal-box";
import { PaperbotMascot } from "@/components/sections/paperbot/paperbot-mascot";
import { PaperbotMonitorWidget } from "@/components/sections/paperbot/paperbot-monitor-widget";
import { Card } from "@/components/ui/card";
import type { PaperSettings, PaperSignalState } from "@/components/sections/paperbot/types";
import type { PaperBotSettings } from "@/lib/api";

const PIPELINE_STEPS = [
    { key: "signal", label: "Сигнал", hint: "forward Reversal · 4–8ч" },
    { key: "plan", label: "План", hint: "entry · SL · TP · размер" },
    { key: "exec", label: "Исполнение", hint: "paper / демо" },
    { key: "watch", label: "Мониторинг", hint: "до выхода по правилам" },
    { key: "close", label: "Закрытие", hint: "журнал и история" },
] as const;

function toSettings(s: PaperBotSettings): PaperSettings {
    return {
        depositUsd: s.depositUsd,
        riskPct: s.riskPct,
        leverage: s.leverage,
        leverageEnabled: s.leverageEnabled ?? true,
        minConfidence: s.minConfidence as PaperSettings["minConfidence"],
        minProbabilityPct: s.minProbabilityPct,
        allowLong: s.allowLong,
        allowShort: s.allowShort,
        maxPositions: s.maxPositions,
        positionTimeoutHours: s.positionTimeoutHours ?? 48,
    };
}

function toSignal(s: PaperBotState["signal"]): PaperSignalState | null {
    if (!s) return null;
    return {
        direction: s.direction as PaperSignalState["direction"],
        probability: s.probability,
        confidence: s.confidence as PaperSignalState["confidence"],
        label: s.label,
        updatedAt: s.updatedAt,
    };
}

function statusDot(active: boolean) {
    return active
        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
        : "bg-emerald-400/50 animate-paperbot-standby";
}

export function PaperbotView() {
    const { data, loading, refreshing } = useApi<PaperBotState>(
        getPaperbotState,
        [],
        { intervalMs: 30_000 },
    );

    const isActive = data?.settings.isActive ?? false;
    const effectiveSettings: PaperSettings = data ? toSettings(data.settings) : {
        depositUsd: 1000, riskPct: 2, leverage: 10, leverageEnabled: true,
        minConfidence: "medium", minProbabilityPct: 60,
        allowLong: true, allowShort: true, maxPositions: 1, positionTimeoutHours: 48,
    };

    const summary = data ? {
        equityUsd: data.summary.equityUsd,
        startingUsd: data.summary.startingUsd,
        unrealizedUsd: data.summary.unrealizedUsd,
        realizedTodayUsd: data.summary.realizedTodayUsd,
        winRatePct: data.summary.winRatePct,
        tradesToday: data.summary.tradesToday,
        winRateLifetimePct: data.summary.winRateLifetimePct,
        maxDrawdownPct: data.summary.maxDrawdownPct,
        totalTrades: data.summary.totalTrades,
    } : null;

    const positions = data?.positions.map(p => ({
        id: p.id, symbol: p.symbol, side: p.side as "long" | "short",
        size: p.size, entry: p.entry, mark: p.mark, sl: p.sl, tp: p.tp,
        leverage: p.leverage, openedAt: p.openedAt,
        pnlUsd: p.pnlUsd, pnlPct: p.pnlPct,
        distanceToSlPct: p.distanceToSlPct, distanceToTpPct: p.distanceToTpPct,
    })) ?? [];

    const closedTrades = data?.closedTrades.map(t => ({
        id: t.id, symbol: t.symbol, side: t.side as "long" | "short",
        entry: t.entry, exit: t.exit, size: t.size, leverage: t.leverage,
        openedAt: t.openedAt, closedAt: t.closedAt,
        pnlUsd: t.pnlUsd, pnlPct: t.pnlPct,
        closeReason: t.closeReason as "sl" | "tp" | "manual" | "signal_flip",
    })) ?? [];

    const logEntries = data?.log.map(e => ({
        id: e.id, ts: e.ts,
        level: e.level as "info" | "trade" | "risk",
        message: e.message,
    })) ?? [];

    return (
        <div className="relative">
            <div
                className="pointer-events-none absolute inset-x-0 -top-4 h-48 bg-gradient-to-b from-emerald-500/[0.06] via-cyan-500/[0.02] to-transparent blur-2xl"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -right-8 top-32 h-56 w-56 rounded-full bg-cyan-500/[0.04] blur-3xl"
                aria-hidden
            />

            <div className="relative flex flex-col gap-3 border-l border-emerald-500/20 pl-4 md:pl-5">

                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/38">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400/75">
                        <Bot className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        paperbot
                    </span>
                    <span className="hidden text-white/25 sm:inline">·</span>
                    <span>exec_layer</span>
                    <span className="text-white/25">·</span>
                    <span className={isActive ? "text-emerald-400" : "text-amber-400/70"}>
                        {isActive ? "active" : "standby"}
                    </span>
                    {refreshing && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-pulse" />
                    )}
                </div>

                {/* Main header card */}
                <Card
                    title="Пейпербот"
                    subtitle="Автоторговля по сигналам системы — без реальных средств"
                    padded
                    className="relative overflow-visible border-emerald-500/12 bg-gradient-to-br from-emerald-500/[0.05] via-[#0E1117]/90 to-cyan-500/[0.04] shadow-[0_0_0_1px_rgba(52,211,153,0.04)_inset]"
                    right={
                        <div className="relative z-10 flex h-8 min-w-[2.25rem] items-start justify-end sm:h-10 sm:min-w-[3.25rem]">
                            <div
                                className="pointer-events-none absolute left-[46%] top-1/2 w-0 origin-[30%_80%] -translate-x-[132%] -translate-y-[128%] rotate-[11deg] sm:left-[47%] sm:-translate-x-[112%] sm:-translate-y-[142%] sm:rotate-[5deg]"
                                aria-hidden
                            >
                                <PaperbotMascot size="lg" botActive={isActive} />
                            </div>
                        </div>
                    }
                >
                    <p className="text-[12px] leading-relaxed text-white/60">
                        Бот следит за сигналами Reversal Radar в forward-режиме и открывает paper-позицию,
                        когда сигнал проходит заданные фильтры. SL и TP рассчитываются по ATR-14 · 4H.
                        Вся история, изменения и выходы записываются в журнал.
                    </p>

                    {/* Status bar — read-only */}
                    <div className={`mt-4 rounded-2xl border p-5 backdrop-blur-sm transition-colors ${
                        loading
                            ? "border-white/8 bg-black/30"
                            : isActive
                            ? "border-emerald-500/30 bg-emerald-500/[0.07] shadow-[0_0_40px_rgba(52,211,153,0.06)_inset]"
                            : "border-white/8 bg-black/30"
                    }`}>
                        <div className="flex items-center gap-3">
                            <span className={`h-3 w-3 shrink-0 rounded-full ring-2 ring-white/10 ${statusDot(isActive)}`} />
                            <div className="text-base font-semibold text-white">
                                {loading
                                    ? "Загрузка..."
                                    : isActive
                                    ? "Бот активен · отслеживает рынок"
                                    : "Бот остановлен"}
                            </div>
                        </div>
                        {!loading && isActive && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {[
                                    { label: "Риск", value: `${effectiveSettings.riskPct}%` },
                                    {
                                        label: "Плечо",
                                        value: effectiveSettings.leverageEnabled
                                            ? `${effectiveSettings.leverage}x`
                                            : "без плеча",
                                    },
                                    { label: "Сигнал", value: `≥ ${effectiveSettings.minConfidence.toUpperCase()}` },
                                    { label: "Вероятность", value: `≥ ${effectiveSettings.minProbabilityPct}%` },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-1.5">
                                        <span className="text-[11px] text-white/45">{label}</span>
                                        <span className="text-[12px] font-semibold text-emerald-300">{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!loading && !isActive && (
                            <div className="mt-2 text-[12px] text-white/35">Ожидает запуска</div>
                        )}
                    </div>

                    {/* Pipeline steps */}
                    <div className="mt-5">
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
                                Цикл одной сделки
                            </span>
                            <span className="hidden font-mono text-[9px] text-white/28 sm:inline">seq · 01→05</span>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-x-0 sm:gap-y-2">
                            {PIPELINE_STEPS.map((step, i) => (
                                <div key={step.key} className="flex items-stretch sm:contents">
                                    <div className="flex min-w-0 flex-1 sm:flex-none sm:basis-0 sm:grow">
                                        <div className="relative w-full rounded-lg border border-white/8 border-t-emerald-400/25 bg-[#0A0C10]/95 px-3 py-2.5 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.06)]">
                                            <span className="absolute right-2 top-2 font-mono text-[9px] tabular-nums text-emerald-500/35">
                                                {String(i + 1).padStart(2, "0")}
                                            </span>
                                            <span className="pr-7 text-[11px] font-semibold text-white/82">{step.label}</span>
                                            <span className="mt-0.5 block text-[10px] leading-snug text-white/42">{step.hint}</span>
                                        </div>
                                    </div>
                                    {i < PIPELINE_STEPS.length - 1 && (
                                        <div className="hidden shrink-0 items-center justify-center self-center px-0.5 text-emerald-500/25 sm:flex" aria-hidden>
                                            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Signal box — read-only, no settings comparison */}
                <PaperbotSignalBox signal={toSignal(data?.signal ?? null)} settings={effectiveSettings} />

                {/* Summary */}
                <PaperbotSummary summary={summary} />

                {/* Monitor heartbeat */}
                <PaperbotMonitorWidget monitor={data?.monitor ?? null} />

                {/* Active positions */}
                <PaperbotPositionsTable positions={positions} />

                {/* Closed trades + Activity log */}
                <div className="grid gap-3 lg:grid-cols-[1fr_380px] lg:items-start">
                    <PaperbotClosedTrades trades={closedTrades} />
                    <PaperbotActivityLog entries={logEntries} />
                </div>

            </div>
        </div>
    );
}
