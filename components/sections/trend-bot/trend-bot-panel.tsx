"use client";

import { useState, useCallback } from "react";
import { useApi } from "@/hooks/use-api";
import {
    getTrendBotAllState,
    startTrendBot,
    stopTrendBot,
    updateTrendBotSettings,
    runTrendBotTick,
    runTrendBotMonitor,
    type TrendBotAllState,
    type TrendBotSettings,
    type PaperBotMonitor,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { PaperbotMonitorWidget } from "@/components/sections/paperbot/paperbot-monitor-widget";
import { PaperbotClosedTrades } from "@/components/sections/paperbot/paperbot-closed-trades";
import { PaperbotActivityLog } from "@/components/sections/paperbot/paperbot-activity-log";
import type { PaperClosedTrade, PaperLogEntry } from "@/components/sections/paperbot/types";
import { Play, Square, RefreshCw, TrendingUp, Activity } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | null | undefined, d = 2) {
    if (n == null) return "—";
    return n.toFixed(d);
}

function fmtPrice(n: number | null | undefined) {
    if (n == null) return "—";
    if (n > 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
    if (n > 100) return n.toFixed(2);
    return n.toFixed(4);
}

function signalColor(s: string | null | undefined) {
    if (s === "ready") return "text-emerald-400";
    if (s === "wait") return "text-amber-400";
    if (s === "caution") return "text-orange-400";
    return "text-white/30";
}

function signalLabel(s: string | null | undefined) {
    if (s === "ready") return "READY";
    if (s === "wait") return "WAIT";
    if (s === "caution") return "CAUTION";
    return "—";
}

function macroColor(b: string | null | undefined) {
    if (b === "bullish") return "text-emerald-400";
    if (b === "bearish") return "text-rose-400";
    return "text-white/35";
}

function relTime(iso: string | null | undefined) {
    if (!iso) return "—";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}с`;
    if (diff < 3600) return `${Math.round(diff / 60)}м`;
    if (diff < 86400) return `${Math.round(diff / 3600)}ч`;
    return `${Math.round(diff / 86400)}д`;
}

// ---------------------------------------------------------------------------
// Symbol row edit state
// ---------------------------------------------------------------------------

type EditState = {
    [symbol: string]: {
        depositUsd: number;
        riskPct: number;
        allowLong: boolean;
        allowShort: boolean;
        enabled: boolean;
        dirty: boolean;
        saving: boolean;
    };
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TrendBotPanel() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [actionMsg, setActionMsg] = useState<string | null>(null);
    const [runningAction, setRunningAction] = useState<string | null>(null);
    const [editState, setEditState] = useState<EditState>({});

    const { data, loading, error } = useApi<TrendBotAllState>(
        () => getTrendBotAllState(),
        [refreshKey],
    );

    const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

    function getEdit(sym: TrendBotSettings) {
        return editState[sym.symbol] ?? {
            depositUsd: sym.depositUsd,
            riskPct: sym.riskPct,
            allowLong: sym.allowLong,
            allowShort: sym.allowShort,
            enabled: sym.enabled,
            dirty: false,
            saving: false,
        };
    }

    function updateEdit(symbol: string, patch: Partial<EditState[string]>) {
        setEditState(prev => {
            // Если символ ещё не трогали — берём реальные данные из API, не нули
            const symSettings = data?.symbols.find(s => s.symbol === symbol)?.settings;
            const current = prev[symbol] ?? {
                depositUsd: symSettings?.depositUsd ?? 0,
                riskPct: symSettings?.riskPct ?? 0.5,
                allowLong: symSettings?.allowLong ?? true,
                allowShort: symSettings?.allowShort ?? true,
                enabled: symSettings?.enabled ?? true,
                dirty: false,
                saving: false,
            };
            return { ...prev, [symbol]: { ...current, ...patch, dirty: true } };
        });
    }

    async function saveSymbol(symbol: string, posTimeout: number) {
        const e = editState[symbol];
        if (!e) return;
        setEditState(prev => ({ ...prev, [symbol]: { ...prev[symbol], saving: true } }));
        try {
            await updateTrendBotSettings(symbol, {
                depositUsd: e.depositUsd,
                riskPct: e.riskPct,
                allowLong: e.allowLong,
                allowShort: e.allowShort,
                enabled: e.enabled,
                maxPositions: 1,
                positionTimeoutHours: posTimeout,
            });
            setEditState(prev => ({ ...prev, [symbol]: { ...prev[symbol], dirty: false, saving: false } }));
            setActionMsg(`${symbol}: сохранено`);
        } catch {
            setEditState(prev => ({ ...prev, [symbol]: { ...prev[symbol], saving: false } }));
            setActionMsg(`${symbol}: ошибка`);
        }
        setTimeout(() => setActionMsg(null), 3000);
    }

    async function handleGlobalToggle() {
        if (!data) return;
        setRunningAction("toggle");
        try {
            if (data.globalActive) {
                await stopTrendBot();
                setActionMsg("Бот остановлен");
            } else {
                await startTrendBot();
                setActionMsg("Бот запущен");
            }
            refresh();
        } catch {
            setActionMsg("Ошибка");
        }
        setRunningAction(null);
        setTimeout(() => setActionMsg(null), 3000);
    }

    async function handleRunTick() {
        setRunningAction("tick");
        try {
            await runTrendBotTick();
            setActionMsg("Тик выполнен");
            refresh();
        } catch {
            setActionMsg("Ошибка тика");
        }
        setRunningAction(null);
        setTimeout(() => setActionMsg(null), 3000);
    }

    async function handleRunMonitor() {
        setRunningAction("monitor");
        try {
            await runTrendBotMonitor();
            setActionMsg("Монитор запущен");
            refresh();
        } catch {
            setActionMsg("Ошибка монитора");
        }
        setRunningAction(null);
        setTimeout(() => setActionMsg(null), 3000);
    }

    const globalActive = data?.globalActive ?? false;

    // Агрегированный монитор: берём самый свежий lastAt по всем символам
    const aggregateMonitor: PaperBotMonitor | null = data ? (() => {
        const monitors = data.symbols.map(s => s.monitor);
        const withDate = monitors.filter(m => m.lastAt);
        withDate.sort((a, b) => new Date(b.lastAt!).getTime() - new Date(a.lastAt!).getTime());
        const latest = withDate[0] ?? null;
        const totalOpen = data.symbols.reduce((sum, s) => sum + s.positions.length, 0);
        return {
            lastAt: latest?.lastAt ?? null,
            lastPrice: latest?.lastPrice ?? null,
            lastPositions: totalOpen,
        };
    })() : null;

    // Все открытые позиции
    const allPositions = data?.symbols.flatMap(s => s.positions) ?? [];

    // Все закрытые сделки — объединить, отсортировать по дате, взять 50 последних
    const allClosedTrades: PaperClosedTrade[] = (data?.symbols ?? [])
        .flatMap(s => s.closedTrades)
        .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())
        .slice(0, 50)
        .map(t => ({
            id: String(t.id),
            symbol: t.symbol,
            side: t.side as "long" | "short",
            entry: t.entry,
            exit: t.exit,
            size: t.size,
            leverage: t.leverage ?? 1,
            openedAt: t.openedAt,
            closedAt: t.closedAt,
            pnlUsd: t.pnlUsd,
            pnlPct: t.pnlPct,
            closeReason: t.closeReason as PaperClosedTrade["closeReason"],
        }));

    // Журнал
    const logEntries: PaperLogEntry[] = (data?.log ?? []).map(e => ({
        id: String(e.id),
        ts: e.ts,
        level: e.level as PaperLogEntry["level"],
        message: e.message,
    }));

    return (
        <div className="flex flex-col gap-4">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-violet-400" />
                    <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/60">
                        Trend Bot
                    </h2>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        globalActive
                            ? "border-violet-400/30 bg-violet-400/10 text-violet-300"
                            : "border-white/10 bg-white/5 text-white/30"
                    }`}>
                        {globalActive ? "Активен" : "Остановлен"}
                    </span>
                    {data && (
                        <span className="text-[10px] text-white/25">
                            {data.symbols.filter(s => s.settings.enabled).length}/{data.symbols.length} вкл.
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {actionMsg && (
                        <span className="text-[11px] text-white/50">{actionMsg}</span>
                    )}

                    {/* Run Monitor */}
                    <button
                        type="button"
                        onClick={handleRunMonitor}
                        disabled={!!runningAction || loading}
                        title="Монитор позиций (SL/TP/trailing)"
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-violet-400/25 bg-violet-400/[0.07] text-violet-300/60 transition hover:border-violet-400/40 hover:text-violet-300 disabled:opacity-40"
                    >
                        <Activity className={`h-3.5 w-3.5 ${runningAction === "monitor" ? "animate-pulse" : ""}`} />
                    </button>

                    {/* Run Tick */}
                    <button
                        type="button"
                        onClick={handleRunTick}
                        disabled={!!runningAction || loading}
                        title="Ручной тик (сигнал + вход)"
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-300/60 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:opacity-40"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${runningAction === "tick" ? "animate-spin" : ""}`} />
                    </button>

                    {/* Global toggle */}
                    <button
                        type="button"
                        onClick={handleGlobalToggle}
                        disabled={!!runningAction || loading}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded border transition-colors disabled:opacity-40 ${
                            globalActive
                                ? "border-rose-400/35 bg-rose-400/15 text-rose-200 hover:bg-rose-400/25"
                                : "border-violet-400/40 bg-violet-400/15 text-violet-200 hover:bg-violet-400/25"
                        }`}
                        title={globalActive ? "Остановить бот" : "Запустить бот"}
                    >
                        {globalActive
                            ? <Square className="h-3.5 w-3.5" fill="currentColor" />
                            : <Play className="h-3.5 w-3.5 translate-x-px" fill="currentColor" />
                        }
                    </button>

                    {/* Refresh */}
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-white/30 transition hover:border-white/20 hover:text-white/65 disabled:opacity-40"
                        aria-label="Обновить"
                    >
                        <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} strokeWidth={2} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-rose-400/20 bg-rose-400/[0.05] px-3 py-2 text-[11px] text-rose-300/70">
                    Ошибка загрузки: {error}
                </div>
            )}

            {/* ── Таблица символов ── */}
            <Card
                title="Символы"
                subtitle="Настройки и HTF-сигнал по каждому инструменту"
            >
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-[11px]">
                        <thead>
                            <tr className="border-b border-white/6">
                                {["Вкл", "Символ", "Депозит $", "Риск %", "Long", "Short", "Сигнал", "Macro", "Монитор", "Позиций", ""].map(h => (
                                    <th key={h} className="py-2 pr-3 text-left font-medium uppercase tracking-[0.12em] text-white/30 last:pr-0">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && !data ? (
                                <tr>
                                    <td colSpan={11} className="py-6 text-center text-white/25">Загрузка...</td>
                                </tr>
                            ) : (
                                (data?.symbols ?? []).map(sym => {
                                    const s = sym.settings;
                                    const e = getEdit(s);
                                    const signal = sym.htfSignal?.trend_entry_signal;
                                    const macro = sym.htfSignal?.macro_bias;
                                    const openCount = sym.positions.length;
                                    const lastAt = sym.monitor.lastAt;

                                    return (
                                        <tr
                                            key={s.symbol}
                                            className={`border-b border-white/[0.04] transition-opacity ${
                                                e.enabled ? "" : "opacity-40"
                                            }`}
                                        >
                                            {/* Enabled */}
                                            <td className="py-2 pr-3">
                                                <button
                                                    type="button"
                                                    onClick={() => updateEdit(s.symbol, { enabled: !e.enabled })}
                                                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                                                        e.enabled
                                                            ? "border-violet-400/50 bg-violet-400/20"
                                                            : "border-white/20 bg-white/[0.03]"
                                                    }`}
                                                    aria-label={`Toggle ${s.symbol}`}
                                                >
                                                    {e.enabled && <span className="text-[9px] text-violet-300">✓</span>}
                                                </button>
                                            </td>

                                            {/* Symbol */}
                                            <td className="py-2 pr-3 font-mono font-semibold text-white/80">{s.symbol}</td>

                                            {/* Deposit */}
                                            <td className="py-2 pr-3">
                                                <input
                                                    type="number"
                                                    min={500} max={100_000} step={500}
                                                    value={e.depositUsd}
                                                    onChange={ev => updateEdit(s.symbol, { depositUsd: Number(ev.target.value) || e.depositUsd })}
                                                    className="w-24 rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] tabular-nums text-white/70 outline-none focus:border-violet-400/40"
                                                />
                                            </td>

                                            {/* Risk */}
                                            <td className="py-2 pr-3">
                                                <select
                                                    value={e.riskPct}
                                                    onChange={ev => updateEdit(s.symbol, { riskPct: Number(ev.target.value) })}
                                                    className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/70 outline-none focus:border-violet-400/40"
                                                >
                                                    {[0.25, 0.5, 0.75, 1, 1.5, 2].map(v => (
                                                        <option key={v} value={v}>{v}%</option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Long */}
                                            <td className="py-2 pr-3">
                                                <button
                                                    type="button"
                                                    onClick={() => updateEdit(s.symbol, { allowLong: !e.allowLong })}
                                                    className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                                        e.allowLong
                                                            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                                                            : "border-white/10 bg-white/[0.03] text-white/25"
                                                    }`}
                                                >L</button>
                                            </td>

                                            {/* Short */}
                                            <td className="py-2 pr-3">
                                                <button
                                                    type="button"
                                                    onClick={() => updateEdit(s.symbol, { allowShort: !e.allowShort })}
                                                    className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                                        e.allowShort
                                                            ? "border-rose-400/40 bg-rose-400/15 text-rose-300"
                                                            : "border-white/10 bg-white/[0.03] text-white/25"
                                                    }`}
                                                >S</button>
                                            </td>

                                            {/* Signal */}
                                            <td className={`py-2 pr-3 font-semibold ${signalColor(signal)}`}>
                                                {signalLabel(signal)}
                                            </td>

                                            {/* Macro */}
                                            <td className={`py-2 pr-3 ${macroColor(macro)}`}>
                                                {macro ? macro.toUpperCase() : "—"}
                                            </td>

                                            {/* Monitor last tick */}
                                            <td className="py-2 pr-3 text-white/30">
                                                {relTime(lastAt)}
                                            </td>

                                            {/* Open positions */}
                                            <td className="py-2 pr-3">
                                                {openCount > 0 ? (
                                                    <span className="rounded border border-violet-400/30 bg-violet-400/10 px-1.5 py-0.5 text-[10px] text-violet-300">
                                                        {openCount}
                                                    </span>
                                                ) : (
                                                    <span className="text-white/20">—</span>
                                                )}
                                            </td>

                                            {/* Save */}
                                            <td className="py-2">
                                                {e.dirty && (
                                                    <button
                                                        type="button"
                                                        onClick={() => saveSymbol(s.symbol, s.positionTimeoutHours)}
                                                        disabled={e.saving}
                                                        className="rounded border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 text-[10px] font-medium text-violet-300 transition hover:bg-violet-400/20 disabled:opacity-50"
                                                    >
                                                        {e.saving ? "..." : "Сохранить"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* ── Монитор позиций + Открытые позиции ── */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <PaperbotMonitorWidget
                    monitor={aggregateMonitor}
                    botActive={globalActive}
                    openPositionsCount={allPositions.length}
                />

                {/* Открытые позиции */}
                <Card
                    title="Открытые позиции"
                    subtitle={`${allPositions.length > 0 ? `${allPositions.length} активных` : "Нет открытых позиций"}`}
                >
                    {allPositions.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center">
                            <p className="text-[12px] font-medium text-white/40">Нет открытых позиций</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[480px] border-collapse text-[11px]">
                                <thead>
                                    <tr className="border-b border-white/6 text-left text-[10px] uppercase tracking-[0.12em] text-white/30">
                                        <th className="pb-2 pr-3 font-medium">Символ</th>
                                        <th className="pb-2 pr-3 font-medium">Сторона</th>
                                        <th className="pb-2 pr-3 font-medium">Вход</th>
                                        <th className="pb-2 pr-3 font-medium">Текущая</th>
                                        <th className="pb-2 pr-3 font-medium">SL</th>
                                        <th className="pb-2 pr-3 font-medium">TP</th>
                                        <th className="pb-2 font-medium text-right">P&L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPositions.map(pos => (
                                        <tr key={pos.id} className="border-b border-white/[0.04]">
                                            <td className="py-2 pr-3 font-mono font-semibold text-white/70">{pos.symbol}</td>
                                            <td className={`py-2 pr-3 font-semibold ${pos.side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
                                                {pos.side.toUpperCase()}
                                            </td>
                                            <td className="py-2 pr-3 tabular-nums text-white/55">{fmtPrice(pos.entry)}</td>
                                            <td className="py-2 pr-3 tabular-nums text-white/80">{fmtPrice(pos.mark)}</td>
                                            <td className="py-2 pr-3 tabular-nums text-rose-400/70">{fmtPrice(pos.sl)}</td>
                                            <td className="py-2 pr-3 tabular-nums text-emerald-400/70">{fmtPrice(pos.tp)}</td>
                                            <td className="py-2 text-right">
                                                <span className={`font-semibold tabular-nums ${pos.pnlUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                    {pos.pnlUsd >= 0 ? "+" : ""}{fmt(pos.pnlUsd)}
                                                </span>
                                                <div className={`text-[10px] ${pos.pnlPct >= 0 ? "text-emerald-400/60" : "text-rose-400/60"}`}>
                                                    {pos.pnlPct >= 0 ? "+" : ""}{fmt(pos.pnlPct)}%
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {/* ── История сделок + Журнал ── */}
            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                <PaperbotClosedTrades trades={allClosedTrades} />
                <PaperbotActivityLog entries={logEntries} />
            </div>
        </div>
    );
}
