"use client";

import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaperBotMonitor } from "@/lib/api";

type Props = {
    monitor: PaperBotMonitor | null;
    botActive: boolean;
    openPositionsCount: number;
    /** Компактная плитка в ряду админки (как сигнал / управление). */
    compact?: boolean;
};

function fmtAgo(iso: string | null): string {
    if (!iso) return "никогда";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "только что";
    if (mins === 1) return "1 мин назад";
    if (mins < 60) return `${mins} мин назад`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} ч назад`;
}

function fmtPrice(p: number | null): string {
    if (p == null) return "—";
    return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function StatusDot({
    lastAt,
    mode,
}: {
    lastAt: string | null;
    mode: "inactive" | "waiting" | "alive" | "stale" | "never";
}) {
    if (mode === "inactive") {
        return <span className="h-2 w-2 rounded-full bg-white/20" />;
    }
    if (mode === "waiting") {
        return <span className="h-2 w-2 rounded-full bg-rose-400" />;
    }
    if (!lastAt) {
        return <span className="h-2 w-2 rounded-full bg-white/20" />;
    }
    const mins = Math.floor((Date.now() - new Date(lastAt).getTime()) / 60_000);
    // Считаем живым если последний тик был менее 20 мин назад (15 + небольшой запас)
    const alive = mins < 20;
    return (
        <span className="relative flex h-2 w-2 shrink-0">
            {alive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${alive ? "bg-emerald-400" : "bg-amber-400"}`} />
        </span>
    );
}

export function PaperbotMonitorWidget({ monitor, botActive, openPositionsCount, compact }: Props) {
    const lastAt = monitor?.lastAt ?? null;
    const lastPrice = monitor?.lastPrice ?? null;
    const lastPositions = monitor?.lastPositions ?? 0;
    const mins = lastAt ? Math.floor((Date.now() - new Date(lastAt).getTime()) / 60_000) : null;
    const alive = mins !== null && mins < 20;
    const waitingForPositions = botActive && openPositionsCount === 0;

    const mode: "inactive" | "waiting" | "alive" | "stale" | "never" = !botActive
        ? "inactive"
        : waitingForPositions
            ? "waiting"
            : alive
                ? "alive"
                : lastAt
                    ? "stale"
                    : "never";

    const statusShort =
        mode === "inactive"
            ? "Стоп"
            : mode === "waiting"
                ? "Ждёт"
                : mode === "alive"
                    ? "Ок"
                    : mode === "stale"
                        ? "Нет данных"
                        : "…";

    return (
        <Card
            className={`border-white/8 ${compact ? "flex h-full min-h-0 flex-col p-3" : ""}`}
            title="Монитор позиций"
            subtitle={compact ? undefined : "Проверка SL · TP · trailing · тайм-аут"}
            padded={!compact}
            right={
                compact ? (
                    <span className="text-[9px] tabular-nums text-white/35" title="Интервал мониторинга">
                        15м
                    </span>
                ) : (
                    <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">
                        <Activity className="h-3.5 w-3.5" aria-hidden />
                        каждые 15 мин
                    </div>
                )
            }
        >
            <div className={`flex min-h-0 flex-col ${compact ? "min-h-0 flex-1 gap-2" : "gap-3"}`}>
                <div
                    className={`flex shrink-0 items-center gap-2 rounded-xl border border-white/8 bg-black/20 ${compact ? "px-2 py-2" : "px-4 py-3"}`}
                >
                    <StatusDot lastAt={lastAt} mode={mode} />
                    <div className="min-w-0 flex-1">
                        <div className={`font-semibold text-white/85 ${compact ? "text-[11px]" : "text-[12px]"}`}>
                            {compact ? statusShort : mode === "inactive"
                                ? "Остановлен"
                                : mode === "waiting"
                                    ? "Ждёт открытия сделок"
                                    : mode === "alive"
                                        ? "Работает"
                                        : mode === "stale"
                                            ? "Нет данных"
                                            : "Ожидает первого тика"}
                        </div>
                        {!compact && (
                            <div className="mt-0.5 text-[10px] text-white/40">
                                {mode === "waiting"
                                    ? "Запустится автоматически при открытой позиции"
                                    : lastAt
                                        ? `Последняя проверка: ${fmtAgo(lastAt)}`
                                        : "Монитор запустится по расписанию cron"}
                            </div>
                        )}
                        {compact && (
                            <div className="mt-0.5 text-[9px] leading-tight text-white/35">
                                {mode === "waiting"
                                    ? "При открытии поз."
                                    : lastAt
                                        ? fmtAgo(lastAt)
                                        : "cron"}
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className={`grid min-h-0 grid-cols-3 gap-2 ${compact ? "min-h-[108px] flex-1" : ""}`}
                >
                    <div
                        className={`flex min-h-0 flex-col justify-center rounded-lg border border-white/8 bg-white/[0.02] text-center ${
                            compact ? "min-h-[100px] px-2 py-3" : "px-3 py-2.5"
                        }`}
                    >
                        <div
                            className={`uppercase tracking-[0.1em] text-white/35 ${compact ? "text-[10px]" : "text-[10px]"}`}
                        >
                            Время
                        </div>
                        <div
                            className={`font-semibold tabular-nums leading-tight text-white/80 ${compact ? "mt-2 text-base" : "mt-1 text-[12px]"}`}
                        >
                            {fmtAgo(lastAt)}
                        </div>
                    </div>
                    <div
                        className={`flex min-h-0 flex-col justify-center rounded-lg border border-white/8 bg-white/[0.02] text-center ${
                            compact ? "min-h-[100px] px-2 py-3" : "px-3 py-2.5"
                        }`}
                    >
                        <div
                            className={`uppercase tracking-[0.1em] text-white/35 ${compact ? "text-[10px]" : "text-[10px]"}`}
                        >
                            BTC
                        </div>
                        <div
                            className={`font-semibold tabular-nums leading-tight text-white/80 ${compact ? "mt-2 text-base" : "mt-1 text-[12px]"}`}
                        >
                            {fmtPrice(lastPrice)}
                        </div>
                    </div>
                    <div
                        className={`flex min-h-0 flex-col justify-center rounded-lg border border-white/8 bg-white/[0.02] text-center ${
                            compact ? "min-h-[100px] px-2 py-3" : "px-3 py-2.5"
                        }`}
                    >
                        <div
                            className={`uppercase tracking-[0.1em] text-white/35 ${compact ? "text-[10px]" : "text-[10px]"}`}
                        >
                            Поз.
                        </div>
                        <div
                            className={`mt-2 font-semibold tabular-nums leading-tight ${compact ? "text-base" : "mt-1 text-[12px]"} ${
                                lastPositions > 0 ? "text-emerald-300" : "text-white/80"
                            }`}
                        >
                            {botActive ? openPositionsCount : "—"}
                        </div>
                    </div>
                </div>

                {lastAt && mode !== "waiting" && (
                    <div
                        className={`shrink-0 text-center text-white/28 ${compact ? "text-[9px]" : "text-[10px]"}`}
                    >
                        {(() => {
                            const nextMins = 15 - ((mins ?? 0) % 15);
                            return nextMins <= 1
                                ? "След. тик <1м"
                                : `След. ~${nextMins}м`;
                        })()}
                    </div>
                )}
            </div>
        </Card>
    );
}
