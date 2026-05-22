"use client";

import { useEffect, useState } from "react";
import { Play, Square, RefreshCw, LogOut, Shield, Save } from "lucide-react";
import {
    getPaperbotState,
    startPaperbot,
    stopPaperbot,
    updatePaperbotSettings,
    runPaperbotTick,
    getTrendBotState,
    startTrendBot,
    stopTrendBot,
    updateTrendBotSettings,
    runTrendBotTick,
    type PaperBotSettings,
    type PaperBotState,
    type TrendBotSettings,
    type TrendBotState,
} from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { PaperbotSummary } from "@/components/sections/paperbot/paperbot-summary";
import { PaperbotPositionsTable } from "@/components/sections/paperbot/paperbot-positions-table";
import { PaperbotClosedTrades } from "@/components/sections/paperbot/paperbot-closed-trades";
import { PaperbotActivityLog } from "@/components/sections/paperbot/paperbot-activity-log";
import { PaperbotSignalBox } from "@/components/sections/paperbot/paperbot-signal-box";
import { PaperbotSettings } from "@/components/sections/paperbot/paperbot-settings";
import { PaperbotMonitorWidget } from "@/components/sections/paperbot/paperbot-monitor-widget";
import { AccuracyPanel } from "@/components/sections/accuracy-panel";
import { Card } from "@/components/ui/card";
import type { PaperSettings, PaperSignalState } from "@/components/sections/paperbot/types";

// ── Shared helpers ────────────────────────────────────────────────────────────

function toSwingSettings(s: PaperBotSettings): PaperSettings {
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

// ── Login screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                onLogin();
            } else {
                setError("Неверный пароль");
            }
        } catch {
            setError("Ошибка соединения");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#080A0F]">
            <div className="w-full max-w-sm rounded-2xl border border-white/8 bg-[#0E1117]/90 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
                <div className="mb-6 flex items-center gap-3">
                    <Shield className="h-5 w-5 text-emerald-400/80" />
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Admin Panel</div>
                        <div className="text-lg font-semibold text-white">PaperBot Control</div>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <input
                        type="password"
                        placeholder="Пароль администратора"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        className="rounded-lg border border-white/12 bg-black/40 px-4 py-2.5 text-[13px] text-white/85 outline-none placeholder:text-white/30 focus:border-emerald-400/40"
                    />
                    {error && <div className="text-[11px] text-rose-400/80">{error}</div>}
                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="mt-1 rounded-lg border border-emerald-400/35 bg-emerald-400/10 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-emerald-200 transition-colors hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Проверка..." : "Войти"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Trend Bot tab ─────────────────────────────────────────────────────────────

type TrendLocalSettings = {
    depositUsd: number;
    riskPct: number;
    allowLong: boolean;
    allowShort: boolean;
    maxPositions: number;
    positionTimeoutHours: number;
};

const TREND_RISK_OPTIONS = [0.25, 0.5, 1, 2];
const TREND_TIMEOUT_OPTIONS = [
    { label: "14д", hours: 336 },
    { label: "21д", hours: 504 },
    { label: "30д", hours: 720 },
];

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

function PillBtn({
    active, disabled, onClick, children, activeClass,
}: {
    active: boolean; disabled?: boolean; onClick: () => void;
    children: React.ReactNode; activeClass?: string;
}) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={`rounded border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
                active
                    ? (activeClass ?? "border-violet-400/40 bg-violet-400/15 text-violet-200")
                    : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
            }`}
        >
            {children}
        </button>
    );
}

function TrendAdminTab() {
    const [actionPending, setActionPending] = useState(false);
    const [tickPending, setTickPending] = useState(false);
    const [settingsPending, setSettingsPending] = useState(false);
    const [tickMsg, setTickMsg] = useState<string | null>(null);
    const [localSettings, setLocalSettings] = useState<TrendLocalSettings | null>(null);

    const { data, loading, refresh } = useApi<TrendBotState>(
        getTrendBotState, [], { intervalMs: 15_000 },
    );

    const isActive = data?.settings.isActive ?? false;
    const effective: TrendLocalSettings = localSettings ?? (data ? {
        depositUsd: data.settings.depositUsd,
        riskPct: data.settings.riskPct,
        allowLong: data.settings.allowLong,
        allowShort: data.settings.allowShort,
        maxPositions: data.settings.maxPositions,
        positionTimeoutHours: data.settings.positionTimeoutHours,
    } : { depositUsd: 1000, riskPct: 0.5, allowLong: true, allowShort: false, maxPositions: 1, positionTimeoutHours: 504 });

    function patch(patch: Partial<TrendLocalSettings>) {
        setLocalSettings({ ...effective, ...patch });
    }

    async function handleToggle() {
        setActionPending(true);
        try {
            if (isActive) {
                await stopTrendBot();
            } else {
                if (localSettings) {
                    setSettingsPending(true);
                    try { await updateTrendBotSettings(localSettings as Omit<TrendBotSettings, "isActive">); }
                    finally { setSettingsPending(false); }
                }
                await startTrendBot();
                setLocalSettings(null);
            }
            refresh();
        } finally {
            setActionPending(false);
        }
    }

    async function handleSave() {
        if (!localSettings) return;
        setSettingsPending(true);
        try {
            await updateTrendBotSettings(localSettings as Omit<TrendBotSettings, "isActive">);
            setLocalSettings(null);
            refresh();
        } finally {
            setSettingsPending(false);
        }
    }

    async function handleTick() {
        setTickPending(true);
        setTickMsg(null);
        try {
            await runTrendBotTick();
            setTickMsg("Тик выполнен");
            refresh();
        } catch {
            setTickMsg("Ошибка тика");
        } finally {
            setTickPending(false);
            setTimeout(() => setTickMsg(null), 4000);
        }
    }

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

    const settingsChanged = localSettings !== null;

    return (
        <div className="flex flex-col gap-4">
            {/* Top row: controls + HTF signal + positions */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:items-stretch">
                {/* Controls */}
                <Card
                    title="Trend Bot"
                    subtitle={isActive ? "Активен" : "Стоп"}
                    padded
                    className="flex flex-col border-violet-500/15 bg-gradient-to-br from-violet-500/[0.04] via-[#0E1117]/90 to-transparent"
                >
                    <div className="flex flex-1 flex-col items-center justify-center gap-3">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                            HTF · без плеча · до 21 дня
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleToggle}
                                disabled={actionPending || loading}
                                title={isActive ? "Остановить" : "Запустить"}
                                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${
                                    isActive
                                        ? "border-rose-400/35 bg-rose-400/15 text-rose-200 hover:bg-rose-400/25"
                                        : "border-violet-400/40 bg-violet-400/15 text-violet-200 hover:bg-violet-400/25"
                                }`}
                            >
                                {isActive
                                    ? <Square className="h-5 w-5" fill="currentColor" />
                                    : <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />}
                            </button>
                            <button
                                onClick={handleTick}
                                disabled={tickPending || loading}
                                title="Ручной тик"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw className={`h-5 w-5 ${tickPending ? "animate-spin" : ""}`} />
                            </button>
                            {settingsChanged && !isActive && (
                                <button
                                    onClick={handleSave}
                                    disabled={settingsPending}
                                    title="Сохранить настройки"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 disabled:opacity-50 transition-colors"
                                >
                                    <Save className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {tickMsg && (
                            <p className="text-center text-[10px] leading-tight text-emerald-300/80">{tickMsg}</p>
                        )}
                    </div>
                </Card>

                {/* HTF Signal */}
                <Card title="HTF Сигнал" subtitle="Trend Entry Signal" padded className="flex flex-col">
                    {loading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <div className="h-8 w-24 animate-pulse rounded bg-white/8" />
                        </div>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2">
                            <div className="text-3xl font-bold tracking-widest" style={{ color: sigColor }}>
                                {trendSignalLabel(signal)}
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
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
                            </div>
                            {htf?.updated_at && (
                                <div className="text-[10px] text-white/25">
                                    обновлено {new Date(htf.updated_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                            )}
                            {!htf && !loading && (
                                <div className="text-[11px] text-white/30">HTF кеш пуст — запустите /api/htf/run</div>
                            )}
                        </div>
                    )}
                </Card>

                <PaperbotPositionsTable compact positions={positions} />
            </div>

            {/* Summary + Settings */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <PaperbotSummary collapsible layout="vertical" summary={summary} />

                {/* Trend Settings */}
                <Card title="Параметры Trend Bot" subtitle="Риск и горизонт позиции" padded className="self-start">
                    <div className="flex flex-col gap-4">
                        {/* Deposit */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">Депозит ($)</div>
                            <div className="mt-1.5 flex items-center gap-2">
                                <input
                                    type="number" min={100} max={100_000} step={100}
                                    value={effective.depositUsd}
                                    disabled={isActive}
                                    onChange={(e) => patch({ depositUsd: Number(e.target.value) || effective.depositUsd })}
                                    className="w-32 rounded border border-white/12 bg-black/35 px-2.5 py-1.5 text-[12px] tabular-nums text-white/80 outline-none focus:border-violet-400/40 disabled:opacity-50"
                                />
                                <span className="text-[11px] text-white/30">USD · виртуальные средства</span>
                            </div>
                        </div>

                        {/* Risk */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">Риск на сделку</div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {TREND_RISK_OPTIONS.map(r => (
                                    <PillBtn
                                        key={r}
                                        active={effective.riskPct === r}
                                        disabled={isActive}
                                        onClick={() => patch({ riskPct: r })}
                                    >
                                        {r}%
                                    </PillBtn>
                                ))}
                            </div>
                            <div className="mt-1 text-[10px] text-white/30">
                                SL = 2× недельный ATR · плечо не используется
                            </div>
                        </div>

                        {/* Timeout */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">Тайм-аут позиции</div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {TREND_TIMEOUT_OPTIONS.map(opt => (
                                    <PillBtn
                                        key={opt.hours}
                                        active={effective.positionTimeoutHours === opt.hours}
                                        disabled={isActive}
                                        onClick={() => patch({ positionTimeoutHours: opt.hours })}
                                    >
                                        {opt.label}
                                    </PillBtn>
                                ))}
                            </div>
                        </div>

                        {/* Directions */}
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">Направления</div>
                            <div className="mt-1.5 flex gap-2">
                                <button
                                    disabled={isActive}
                                    onClick={() => !isActive && patch({ allowLong: !effective.allowLong })}
                                    className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                                        effective.allowLong
                                            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                                            : "border-white/10 bg-white/[0.04] text-white/35"
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${effective.allowLong ? "bg-emerald-400" : "bg-white/20"}`} />
                                    LONG
                                </button>
                                <button
                                    disabled={isActive}
                                    onClick={() => !isActive && patch({ allowShort: !effective.allowShort })}
                                    className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                                        effective.allowShort
                                            ? "border-rose-400/40 bg-rose-400/15 text-rose-200"
                                            : "border-white/10 bg-white/[0.04] text-white/35"
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${effective.allowShort ? "bg-rose-400" : "bg-white/20"}`} />
                                    SHORT
                                </button>
                            </div>
                        </div>

                        {isActive && (
                            <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-[11px] text-amber-200/60">
                                Остановите бота для изменения параметров
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Closed trades + Log */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <PaperbotClosedTrades trades={closedTrades} />
                <PaperbotActivityLog entries={logEntries} />
            </div>
        </div>
    );
}

// ── Swing Bot tab (existing content) ─────────────────────────────────────────

function SwingAdminTab() {
    const [actionPending, setActionPending] = useState(false);
    const [tickPending, setTickPending] = useState(false);
    const [settingsPending, setSettingsPending] = useState(false);
    const [tickMsg, setTickMsg] = useState<string | null>(null);

    const { data, loading, refreshing, refresh } = useApi<PaperBotState>(
        getPaperbotState, [], { intervalMs: 15_000 },
    );

    const isActive = data?.settings.isActive ?? false;
    const [localSettings, setLocalSettings] = useState<PaperSettings | null>(null);
    const effectiveSettings: PaperSettings = localSettings ??
        (data ? toSwingSettings(data.settings) : {
            depositUsd: 1000, riskPct: 2, leverage: 10, leverageEnabled: true,
            minConfidence: "medium", minProbabilityPct: 65,
            allowLong: true, allowShort: true, maxPositions: 1, positionTimeoutHours: 48,
        });

    async function handleToggle() {
        setActionPending(true);
        try {
            if (isActive) {
                await stopPaperbot();
            } else {
                if (localSettings) {
                    setSettingsPending(true);
                    try { await updatePaperbotSettings(localSettings); }
                    finally { setSettingsPending(false); }
                }
                await startPaperbot();
                setLocalSettings(null);
            }
            refresh();
        } finally {
            setActionPending(false);
        }
    }

    async function handleSaveSettings() {
        if (!localSettings) return;
        setSettingsPending(true);
        try {
            await updatePaperbotSettings(localSettings);
            setLocalSettings(null);
            refresh();
        } finally {
            setSettingsPending(false);
        }
    }

    async function handleTick() {
        setTickPending(true);
        setTickMsg(null);
        try {
            await runPaperbotTick();
            setTickMsg("Тик выполнен успешно");
            refresh();
        } catch {
            setTickMsg("Ошибка при выполнении тика");
        } finally {
            setTickPending(false);
            setTimeout(() => setTickMsg(null), 4000);
        }
    }

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
        <div className="flex flex-col gap-4">
            {refreshing && <span className="h-1.5 w-1.5 self-start rounded-full bg-cyan-400/60 animate-pulse" />}

            {/* Top row: 4 tiles */}
            <div className="grid min-h-[200px] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
                <Card
                    title="Управление ботом"
                    subtitle={isActive ? "Активен" : "Стоп"}
                    padded
                    className="flex min-h-[200px] flex-col border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.04] via-[#0E1117]/90 to-transparent"
                >
                    <div className="flex flex-1 flex-col items-center justify-center gap-3">
                        <div className="flex items-center justify-center gap-2">
                            <button
                                type="button"
                                onClick={handleToggle}
                                disabled={actionPending || loading}
                                title={isActive ? "Остановить бота" : "Запустить бота"}
                                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isActive
                                        ? "border-rose-400/35 bg-rose-400/15 text-rose-200 hover:bg-rose-400/25"
                                        : "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25"
                                }`}
                            >
                                {isActive ? <Square className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />}
                            </button>
                            <button
                                type="button"
                                onClick={handleTick}
                                disabled={tickPending || loading}
                                title="Ручной тик"
                                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RefreshCw className={`h-5 w-5 ${tickPending ? "animate-spin" : ""}`} />
                            </button>
                        </div>
                        {localSettings && !isActive && (
                            <button
                                type="button"
                                onClick={handleSaveSettings}
                                disabled={settingsPending}
                                title="Сохранить настройки"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-400/10 text-amber-200 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                            </button>
                        )}
                        {tickMsg && (
                            <p className="max-w-full px-1 text-center text-[10px] leading-tight text-emerald-300/80">
                                {tickMsg}
                            </p>
                        )}
                    </div>
                </Card>

                <PaperbotSignalBox compact signal={toSignal(data?.signal ?? null)} settings={effectiveSettings} />
                <PaperbotMonitorWidget compact monitor={data?.monitor ?? null} botActive={isActive} openPositionsCount={positions.length} />
                <PaperbotPositionsTable compact positions={positions} />
            </div>

            {/* Summary + Settings */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <PaperbotSummary collapsible layout="vertical" summary={summary} />
                <PaperbotSettings
                    collapsible
                    settings={effectiveSettings}
                    onChange={setLocalSettings}
                    disabled={isActive || settingsPending}
                />
            </div>

            {/* History + Accuracy | Log */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <div className="flex flex-col gap-4 self-start">
                    <PaperbotClosedTrades trades={closedTrades} />
                    <div className="w-full">
                        <AccuracyPanel />
                    </div>
                </div>
                <div className="self-start">
                    <PaperbotActivityLog entries={logEntries} />
                </div>
            </div>
        </div>
    );
}

// ── Admin panel (tabs wrapper) ────────────────────────────────────────────────

function AdminPanel({ onLogout }: { onLogout: () => void }) {
    const [activeTab, setActiveTab] = useState<"swing" | "trend">("swing");

    async function handleLogout() {
        await fetch("/api/admin/auth", { method: "DELETE" });
        onLogout();
    }

    const tabs = [
        { id: "swing" as const, label: "Swing Bot", sub: "4H · плечо · 48ч" },
        { id: "trend" as const, label: "Trend Bot", sub: "HTF · без плеча · 21д" },
    ];

    return (
        <div className="min-h-screen bg-[#080A0F] px-4 py-6 md:px-8">
            {/* Header */}
            <div className="mx-auto mb-4 flex max-w-7xl items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-emerald-400/70" />
                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Admin · PaperBot Control</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/45 transition-colors hover:border-white/20 hover:text-white/65"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    Выйти
                </button>
            </div>

            {/* Tab switcher */}
            <div className="mx-auto mb-5 flex max-w-7xl gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-4 py-2.5 text-[12px] font-semibold transition-colors ${
                            activeTab === tab.id
                                ? "bg-white/8 text-white/90"
                                : "text-white/35 hover:text-white/55"
                        }`}
                    >
                        {tab.label}
                        <span className="text-[9px] font-normal text-white/30">{tab.sub}</span>
                    </button>
                ))}
            </div>

            <div className="mx-auto max-w-7xl">
                {activeTab === "swing" && <SwingAdminTab />}
                {activeTab === "trend" && <TrendAdminTab />}
            </div>
        </div>
    );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
    const [authed, setAuthed] = useState<boolean | null>(null);
    useEffect(() => {
        let alive = true;
        fetch("/api/admin/auth")
            .then((res) => res.json())
            .then(({ ok }: { ok: boolean }) => { if (alive) setAuthed(ok); })
            .catch(() => { if (alive) setAuthed(false); });
        return () => { alive = false; };
    }, []);

    if (authed === null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#080A0F]">
                <span className="text-[11px] text-white/30">Проверка сессии…</span>
            </div>
        );
    }

    if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;
    return <AdminPanel onLogout={() => setAuthed(false)} />;
}
