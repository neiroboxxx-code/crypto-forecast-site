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

// ── Shared status dot ─────────────────────────────────────────────────────────

function StatusDot({ active, color }: { active: boolean; color: "emerald" | "violet" }) {
    const glow = color === "emerald"
        ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
        : "bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.5)]";
    const dim = color === "emerald" ? "bg-emerald-400/50 animate-paperbot-standby" : "bg-violet-400/40";
    return (
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10 ${active ? glow : dim}`} />
    );
}

// ── Swing Bot blocks ──────────────────────────────────────────────────────────

function SwingStatusCard({ data, loading, refreshing }: {
    data: PaperBotState | null; loading: boolean; refreshing: boolean;
}) {
    const isActive = data?.settings.isActive ?? false;
    const s = data ? toSettings(data.settings) : null;

    return (
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
            <div className={`rounded-xl border p-4 transition-colors ${
                loading ? "border-white/8 bg-black/30"
                : isActive ? "border-emerald-500/30 bg-emerald-500/[0.07] shadow-[0_0_40px_rgba(52,211,153,0.06)_inset]"
                : "border-white/8 bg-black/30"
            }`}>
                <div className="flex items-center gap-2.5">
                    <StatusDot active={isActive} color="emerald" />
                    <span className="text-[13px] font-semibold text-white">
                        {loading ? "Загрузка..." : isActive ? "Бот активен" : "Бот остановлен"}
                    </span>
                    {refreshing && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-pulse" />}
                </div>
                {!loading && isActive && s && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {[
                            { label: "Риск", value: `${s.riskPct}%` },
                            { label: "Плечо", value: s.leverageEnabled ? `${s.leverage}x` : "без плеча" },
                            { label: "Сигнал", value: `≥ ${s.minConfidence.toUpperCase()}` },
                            { label: "Вероятность", value: `≥ ${s.minProbabilityPct}%` },
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
    );
}

// ── Trend Bot blocks ──────────────────────────────────────────────────────────

function TrendStatusCard({ data, loading, refreshing }: {
    data: TrendBotState | null; loading: boolean; refreshing: boolean;
}) {
    const isActive = data?.settings.isActive ?? false;

    return (
        <Card
            title="Trend Bot"
            subtitle="HTF · без плеча · до 21 дня"
            padded
            className="border-violet-500/12 bg-gradient-to-br from-violet-500/[0.05] via-[#0E1117]/90 to-transparent"
        >
            <div className={`rounded-xl border p-4 transition-colors ${
                loading ? "border-white/8 bg-black/30"
                : isActive ? "border-violet-500/30 bg-violet-500/[0.07] shadow-[0_0_40px_rgba(139,92,246,0.06)_inset]"
                : "border-white/8 bg-black/30"
            }`}>
                <div className="flex items-center gap-2.5">
                    <StatusDot active={isActive} color="violet" />
                    <span className="text-[13px] font-semibold text-white">
                        {loading ? "Загрузка..." : isActive ? "Бот активен" : "Бот остановлен"}
                    </span>
                    {refreshing && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-pulse" />}
                </div>
                {!loading && isActive && data && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {[
                            { label: "Риск", value: `${data.settings.riskPct}%` },
                            { label: "Плечо", value: "без плеча" },
                            { label: "Тайм-аут", value: `${Math.round(data.settings.positionTimeoutHours / 24)}д` },
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
        </Card>
    );
}

function TrendSignalCard({ data, loading }: { data: TrendBotState | null; loading: boolean }) {
    const htf = data?.htfSignal;
    const signal = htf?.trend_entry_signal;
    const sigColor = trendSignalColor(signal);

    return (
        <Card title="HTF Сигнал" subtitle="Trend Entry Signal" padded className="flex flex-col">
            <div className="flex flex-1 items-center justify-between gap-4">
                <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/35">Trend Entry</div>
                    <div className="mt-1 text-2xl font-bold tracking-widest" style={{ color: sigColor }}>
                        {loading ? "—" : trendSignalLabel(signal)}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
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
                    {!htf && !loading && (
                        <span className="text-[11px] text-white/30">HTF кеш пуст</span>
                    )}
                </div>
            </div>
        </Card>
    );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export function PaperbotView() {
    const { data: swingData, loading: swingLoading, refreshing: swingRefreshing } =
        useApi<PaperBotState>(getPaperbotState, [], { intervalMs: 30_000 });

    const { data: trendData, loading: trendLoading, refreshing: trendRefreshing } =
        useApi<TrendBotState>(getTrendBotState, [], { intervalMs: 30_000 });

    const swingSettings: PaperSettings = swingData ? toSettings(swingData.settings) : {
        depositUsd: 1000, riskPct: 2, leverage: 10, leverageEnabled: true,
        minConfidence: "medium", minProbabilityPct: 60,
        allowLong: true, allowShort: true, maxPositions: 1, positionTimeoutHours: 48,
    };

    const swingSummary = swingData ? { ...swingData.summary } : null;
    const trendSummary = trendData ? { ...trendData.summary } : null;

    const swingPositions = swingData?.positions.map(p => ({
        id: p.id, symbol: p.symbol, side: p.side as "long" | "short",
        size: p.size, entry: p.entry, mark: p.mark, sl: p.sl, tp: p.tp,
        leverage: p.leverage, openedAt: p.openedAt,
        pnlUsd: p.pnlUsd, pnlPct: p.pnlPct,
        distanceToSlPct: p.distanceToSlPct, distanceToTpPct: p.distanceToTpPct,
    })) ?? [];

    const trendPositions = trendData?.positions.map(p => ({
        id: p.id, symbol: p.symbol, side: p.side as "long" | "short",
        size: p.size, entry: p.entry, mark: p.mark, sl: p.sl, tp: p.tp,
        leverage: p.leverage, openedAt: p.openedAt,
        pnlUsd: p.pnlUsd, pnlPct: p.pnlPct,
        distanceToSlPct: p.distanceToSlPct, distanceToTpPct: p.distanceToTpPct,
    })) ?? [];

    const swingClosed = swingData?.closedTrades.map(t => ({
        id: t.id, symbol: t.symbol, side: t.side as "long" | "short",
        entry: t.entry, exit: t.exit, size: t.size, leverage: t.leverage,
        openedAt: t.openedAt, closedAt: t.closedAt,
        pnlUsd: t.pnlUsd, pnlPct: t.pnlPct,
        closeReason: t.closeReason as "sl" | "tp" | "manual" | "signal_flip",
    })) ?? [];

    const trendClosed = trendData?.closedTrades.map(t => ({
        id: t.id, symbol: t.symbol, side: t.side as "long" | "short",
        entry: t.entry, exit: t.exit, size: t.size, leverage: t.leverage,
        openedAt: t.openedAt, closedAt: t.closedAt,
        pnlUsd: t.pnlUsd, pnlPct: t.pnlPct,
        closeReason: t.closeReason as "sl" | "tp" | "manual" | "signal_flip",
    })) ?? [];

    const swingLog = swingData?.log.map(e => ({
        id: e.id, ts: e.ts, level: e.level as "info" | "trade" | "risk", message: e.message,
    })) ?? [];

    const trendLog = trendData?.log.map(e => ({
        id: e.id, ts: e.ts, level: e.level as "info" | "trade" | "risk", message: e.message,
    })) ?? [];

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

                {/*
                  One flat grid — pairs of blocks share the same row on xl,
                  so corresponding rows auto-align by height.
                  DOM order: all Swing first (mobile), then all Trend.
                  xl:order-* interleaves them into paired rows.
                */}
                <div className="grid gap-3 xl:grid-cols-2">

                    {/* ── Swing column (DOM first = mobile first) ── */}
                    <div className="xl:order-1">
                        <SwingStatusCard data={swingData} loading={swingLoading} refreshing={swingRefreshing} />
                    </div>
                    <div className="xl:order-3">
                        <PaperbotSignalBox signal={toSignal(swingData?.signal ?? null)} settings={swingSettings} />
                    </div>
                    <div className="xl:order-5">
                        <PaperbotSummary summary={swingSummary} />
                    </div>
                    <div className="xl:order-7">
                        <PaperbotPositionsTable positions={swingPositions} />
                    </div>
                    <div className="xl:order-9">
                        <PaperbotClosedTrades trades={swingClosed} />
                    </div>
                    <div className="xl:order-11">
                        <PaperbotActivityLog entries={swingLog} />
                    </div>

                    {/* Mobile separator between bots */}
                    <div className="xl:hidden xl:order-[0] col-span-full my-2 flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/8" />
                        <span className="text-[10px] uppercase tracking-[0.18em] text-violet-400/60">Trend Bot</span>
                        <div className="h-px flex-1 bg-white/8" />
                    </div>

                    {/* ── Trend column ── */}
                    <div className="xl:order-2">
                        <TrendStatusCard data={trendData} loading={trendLoading} refreshing={trendRefreshing} />
                    </div>
                    <div className="xl:order-4">
                        <TrendSignalCard data={trendData} loading={trendLoading} />
                    </div>
                    <div className="xl:order-6">
                        <PaperbotSummary summary={trendSummary} />
                    </div>
                    <div className="xl:order-8">
                        <PaperbotPositionsTable positions={trendPositions} />
                    </div>
                    <div className="xl:order-10">
                        <PaperbotClosedTrades trades={trendClosed} />
                    </div>
                    <div className="xl:order-12">
                        <PaperbotActivityLog entries={trendLog} />
                    </div>

                </div>
            </div>
        </div>
    );
}
