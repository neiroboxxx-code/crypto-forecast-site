"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Play, Square, RefreshCw, LogOut, Shield } from "lucide-react";
import {
    getPaperbotState,
    startPaperbot,
    stopPaperbot,
    updatePaperbotSettings,
    runPaperbotTick,
    type PaperBotSettings,
    type PaperBotState,
} from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { PaperbotSummary } from "@/components/sections/paperbot/paperbot-summary";
import { PaperbotPositionsTable } from "@/components/sections/paperbot/paperbot-positions-table";
import { PaperbotClosedTrades } from "@/components/sections/paperbot/paperbot-closed-trades";
import { PaperbotActivityLog } from "@/components/sections/paperbot/paperbot-activity-log";
import { PaperbotSignalBox } from "@/components/sections/paperbot/paperbot-signal-box";
import { PaperbotSettings } from "@/components/sections/paperbot/paperbot-settings";
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
                    {error && (
                        <div className="text-[11px] text-rose-400/80">{error}</div>
                    )}
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

// ── Admin panel ───────────────────────────────────────────────────────────────

function AdminPanel({ onLogout }: { onLogout: () => void }) {
    const [actionPending, setActionPending] = useState(false);
    const [tickPending, setTickPending] = useState(false);
    const [settingsPending, setSettingsPending] = useState(false);
    const [tickMsg, setTickMsg] = useState<string | null>(null);

    const { data, loading, refreshing, refresh } = useApi<PaperBotState>(
        getPaperbotState,
        [],
        { intervalMs: 15_000 },
    );

    const isActive = data?.settings.isActive ?? false;
    const [localSettings, setLocalSettings] = useState<PaperSettings | null>(null);
    const effectiveSettings: PaperSettings = localSettings ??
        (data ? toSettings(data.settings) : {
            depositUsd: 1000, riskPct: 2, leverage: 10, leverageEnabled: true,
            minConfidence: "medium", minProbabilityPct: 60,
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

    async function handleLogout() {
        await fetch("/api/admin/auth", { method: "DELETE" });
        onLogout();
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
        <div className="min-h-screen bg-[#080A0F] px-4 py-6 md:px-8">
            {/* Header */}
            <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-emerald-400/70" />
                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">Admin · PaperBot Control</span>
                    {refreshing && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-pulse" />}
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/45 transition-colors hover:border-white/20 hover:text-white/65"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    Выйти
                </button>
            </div>

            <div className="mx-auto flex max-w-5xl flex-col gap-4">

                {/* Control card */}
                <Card
                    title="Управление ботом"
                    subtitle={isActive ? "Бот активен · отслеживает сигналы каждые 4H" : "Бот остановлен"}
                    padded
                    className="border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.04] via-[#0E1117]/90 to-transparent"
                >
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Start / Stop */}
                        <button
                            onClick={handleToggle}
                            disabled={actionPending || loading}
                            className={`inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-[12px] font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                isActive
                                    ? "border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
                                    : "border-emerald-400/35 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
                            }`}
                        >
                            {isActive
                                ? <><Square className="h-3.5 w-3.5" /> Остановить</>
                                : <><Play className="h-3.5 w-3.5" /> Запустить</>
                            }
                        </button>

                        {/* Manual tick */}
                        <button
                            onClick={handleTick}
                            disabled={tickPending || loading}
                            className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/8 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-cyan-200/80 transition-colors hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${tickPending ? "animate-spin" : ""}`} />
                            Ручной тик
                        </button>

                        {/* Save settings (only when bot is stopped and settings changed) */}
                        {localSettings && !isActive && (
                            <button
                                onClick={handleSaveSettings}
                                disabled={settingsPending}
                                className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/8 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-amber-200/80 transition-colors hover:bg-amber-400/15 disabled:opacity-50"
                            >
                                {settingsPending ? "Сохраняем..." : "Сохранить настройки"}
                            </button>
                        )}

                        {tickMsg && (
                            <span className="text-[11px] text-emerald-300/70">{tickMsg}</span>
                        )}
                    </div>
                </Card>

                {/* Signal + Settings */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <PaperbotSignalBox signal={toSignal(data?.signal ?? null)} settings={effectiveSettings} />
                    <PaperbotSettings
                        settings={effectiveSettings}
                        onChange={setLocalSettings}
                        disabled={isActive || settingsPending}
                    />
                </div>

                <PaperbotSummary summary={summary} />
                <PaperbotPositionsTable positions={positions} />

                <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
                    <PaperbotClosedTrades trades={closedTrades} />
                    <PaperbotActivityLog entries={logEntries} />
                </div>

            </div>
        </div>
    );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
    const [authed, setAuthed] = useState<boolean | null>(null);

    const checkAuth = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/auth");
            const { ok } = await res.json();
            setAuthed(ok);
        } catch {
            setAuthed(false);
        }
    }, []);

    useEffect(() => { checkAuth(); }, [checkAuth]);

    if (authed === null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#080A0F]">
                <span className="text-[11px] text-white/30">Проверка сессии…</span>
            </div>
        );
    }

    if (!authed) {
        return <LoginScreen onLogin={() => setAuthed(true)} />;
    }

    return <AdminPanel onLogout={() => setAuthed(false)} />;
}
