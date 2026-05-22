"use client";

import { Bot } from "lucide-react";
import {
    getPaperbotState,
    getTrendBotState,
    type PaperBotState,
    type TrendBotState,
    type PaperBotSettings,
} from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { PaperbotSummary } from "@/components/sections/paperbot/paperbot-summary";
import { PaperbotPositionsTable } from "@/components/sections/paperbot/paperbot-positions-table";
import { PaperbotClosedTrades } from "@/components/sections/paperbot/paperbot-closed-trades";
import { PaperbotActivityLog } from "@/components/sections/paperbot/paperbot-activity-log";
import { PaperbotSignalBox } from "@/components/sections/paperbot/paperbot-signal-box";
import { PaperbotMascot } from "@/components/sections/paperbot/paperbot-mascot";
import { Card } from "@/components/ui/card";
import type { PaperSettings, PaperSignalState } from "@/components/sections/paperbot/types";

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

function trendSignalColor(s: string | null | undefined): string {
    if (s === "ready") return "#34d399";
    if (s === "wait") return "#fbbf24";
    if (s === "caution") return "#fb923c";
    return "#6b7280";
}

function trendSignalLabel(s: string | null | undefined): string {
    if (s === "ready") return "READY";
    if (s === "wait") return "WAIT";
    if (s === "caution") return "НЕ СЕЙЧАС";
    return "—";
}

// ── Swing Bot panel ───────────────────────────────────────────────────────────

function SwingBotPanel() {
    const { data, loading, refreshing } = useApi<PaperBotState>(
        getPaperbotState, [], { intervalMs: 30_000 },
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
        <div className="flex flex-col gap-3">
            {/* Header */}
            <Card
                title="Swing Bot"
                subtitle="4H · плечо · реверсальный сигнал"
                padded
                className="relative overflow-visible border-emerald-500/12 bg-gradient-to-br from-emerald-500/[0.05] via-[#0E1117]/90 to-cyan-500/[0.04]"
                right={
                    <div className="relative z-10 flex h-8 min-w-[2rem] items-start justify-end">
                        <div
                            className="pointer-events-none absolute left-[46%] top-1/2 w-0 origin-[30%_80%] -translate-x-[132%] -translate-y-[128%] rotate-[11deg]"
                            aria-hidden
                        >
                            <PaperbotMascot size="lg" botActive={isActive} />
                        </div>
                    </div>
                }
            >
                {/* Status */}
                <div className={`rounded-xl border p-4 transition-colors ${
                    loading ? "border-white/8 bg-black/30"
                    : isActive ? "border-emerald-500/30 bg-emerald-500/[0.07] shadow-[0_0_40px_rgba(52,211,153,0.06)_inset]"
                    : "border-white/8 bg-black/30"
                }`}>
                    <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10 ${
                            isActive
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                                : "bg-emerald-400/50 animate-paperbot-standby"
                        }`} />
                        <span className="text-[13px] font-semibold text-white">
                            {loading ? "Загрузка..." : isActive ? "Бот активен" : "Бот остановлен"}
                        </span>
                        {refreshing && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-pulse" />}
                    </div>
                    {!loading && isActive && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {[
                                { label: "Риск", value: `${effectiveSettings.riskPct}%` },
                                { label: "Плечо", value: effectiveSettings.leverageEnabled ? `${effectiveSettings.leverage}x` : "без плеча" },
                                { label: "Сигнал", value: `≥ ${effectiveSettings.minConfidence.toUpperCase()}` },
                                { label: "Вероятность", value: `≥ ${effectiveSettings.minProbabilityPct}%` },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1">
                                    <span className="text-[10px] text-white/45">{label}</span>
                                    <span className="text-[11px] font-semibold text-emerald-300">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && !isActive && (
                        <div className="mt-1.5 text-[11px] text-white/35">Ожидает запуска</div>
                    )}
                </div>
            </Card>

            <PaperbotSignalBox signal={toSignal(data?.signal ?? null)} settings={effectiveSettings} />
            <PaperbotSummary summary={summary} />
            <PaperbotPositionsTable positions={positions} />
            <PaperbotClosedTrades trades={closedTrades} />
            <PaperbotActivityLog entries={logEntries} />
        </div>
    );
}

// ── Trend Bot panel ───────────────────────────────────────────────────────────

function TrendBotPanel() {
    const { data, loading, refreshing } = useApi<TrendBotState>(
        getTrendBotState, [], { intervalMs: 30_000 },
    );

    const isActive = data?.settings.isActive ?? false;
    const htf = data?.htfSignal;
    const signal = htf?.trend_entry_signal;
    const sigColor = trendSignalColor(signal);

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
        <div className="flex flex-col gap-3">
            {/* Header */}
            <Card
                title="Trend Bot"
                subtitle="HTF · без плеча · до 21 дня"
                padded
                className="border-violet-500/12 bg-gradient-to-br from-violet-500/[0.05] via-[#0E1117]/90 to-transparent"
            >
                {/* Status */}
                <div className={`rounded-xl border p-4 transition-colors ${
                    loading ? "border-white/8 bg-black/30"
                    : isActive ? "border-violet-500/30 bg-violet-500/[0.07] shadow-[0_0_40px_rgba(139,92,246,0.06)_inset]"
                    : "border-white/8 bg-black/30"
                }`}>
                    <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10 ${
                            isActive ? "bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "bg-violet-400/40"
                        }`} />
                        <span className="text-[13px] font-semibold text-white">
                            {loading ? "Загрузка..." : isActive ? "Бот активен" : "Бот остановлен"}
                        </span>
                        {refreshing && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-pulse" />}
                    </div>
                    {!loading && isActive && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {[
                                { label: "Риск", value: `${data!.settings.riskPct}%` },
                                { label: "Плечо", value: "без плеча" },
                                { label: "Тайм-аут", value: `${Math.round(data!.settings.positionTimeoutHours / 24)}д` },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex items-center gap-1.5 rounded-lg border border-violet-500/15 bg-violet-500/[0.06] px-2.5 py-1">
                                    <span className="text-[10px] text-white/45">{label}</span>
                                    <span className="text-[11px] font-semibold text-violet-300">{value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {!loading && !isActive && (
                        <div className="mt-1.5 text-[11px] text-white/35">Ожидает запуска</div>
                    )}
                </div>

                {/* HTF Signal */}
                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/35">HTF Сигнал</div>
                        <div className="mt-0.5 text-xl font-bold tracking-widest" style={{ color: sigColor }}>
                            {loading ? "—" : trendSignalLabel(signal)}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {htf?.macro_bias && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                                {htf.macro_bias}
                            </span>
                        )}
                        {htf?.long_context && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-white/50">
                                {htf.long_context}
                            </span>
                        )}
                        {htf?.updated_at && (
                            <span className="text-[10px] text-white/25">
                                {new Date(htf.updated_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            <PaperbotSummary summary={summary} />
            <PaperbotPositionsTable positions={positions} />
            <PaperbotClosedTrades trades={closedTrades} />
            <PaperbotActivityLog entries={logEntries} />
        </div>
    );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export function PaperbotView() {
    return (
        <div className="relative">
            <div
                className="pointer-events-none absolute inset-x-0 -top-4 h-48 bg-gradient-to-b from-emerald-500/[0.05] via-violet-500/[0.02] to-transparent blur-2xl"
                aria-hidden
            />

            <div className="relative flex flex-col gap-4 border-l border-emerald-500/20 pl-4 md:pl-5">
                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/38">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400/75">
                        <Bot className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        paperbot
                    </span>
                    <span className="text-white/25">·</span>
                    <span>exec_layer</span>
                    <span className="text-white/25">·</span>
                    <span className="text-white/40">swing + trend</span>
                </div>

                {/* Two bots side by side */}
                <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
                    <SwingBotPanel />
                    <TrendBotPanel />
                </div>
            </div>
        </div>
    );
}
