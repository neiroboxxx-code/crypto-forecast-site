"use client";

import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaperBotMonitor } from "@/lib/api";

type Props = {
    monitor: PaperBotMonitor | null;
    botActive: boolean;
    openPositionsCount: number;
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

export function PaperbotMonitorWidget({ monitor, botActive, openPositionsCount }: Props) {
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

    return (
        <Card
            className="border-white/8"
            title="Монитор позиций"
            subtitle="Проверка SL · TP · trailing · тайм-аут"
            right={
                <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">
                    <Activity className="h-3.5 w-3.5" aria-hidden />
                    каждые 15 мин
                </div>
            }
        >
            <div className="flex flex-col gap-3">
                {/* Status row */}
                <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3">
                    <StatusDot lastAt={lastAt} mode={mode} />
                    <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-white/85">
                            {mode === "inactive"
                                ? "Остановлен"
                                : mode === "waiting"
                                    ? "Ждёт открытия сделок"
                                    : mode === "alive"
                                        ? "Работает"
                                        : mode === "stale"
                                            ? "Нет данных"
                                            : "Ожидает первого тика"}
                        </div>
                        <div className="mt-0.5 text-[10px] text-white/40">
                            {mode === "waiting"
                                ? "Запустится автоматически при открытой позиции"
                                : lastAt
                                    ? `Последняя проверка: ${fmtAgo(lastAt)}`
                                    : "Монитор запустится по расписанию cron"}
                        </div>
                    </div>
                </div>

                {/* Stat row */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-center">
                        <div className="text-[10px] uppercase tracking-[0.1em] text-white/35">Время</div>
                        <div className="mt-1 text-[12px] font-semibold tabular-nums text-white/80">
                            {fmtAgo(lastAt)}
                        </div>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-center">
                        <div className="text-[10px] uppercase tracking-[0.1em] text-white/35">BTC цена</div>
                        <div className="mt-1 text-[12px] font-semibold tabular-nums text-white/80">
                            {fmtPrice(lastPrice)}
                        </div>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-center">
                        <div className="text-[10px] uppercase tracking-[0.1em] text-white/35">Позиций</div>
                        <div className={`mt-1 text-[12px] font-semibold tabular-nums ${
                            lastPositions > 0 ? "text-emerald-300" : "text-white/80"
                        }`}>
                            {botActive ? openPositionsCount : "—"}
                        </div>
                    </div>
                </div>

                {/* Next check estimate */}
                {lastAt && mode !== "waiting" && (
                    <div className="text-[10px] text-white/28 text-center">
                        {(() => {
                            const nextMins = 15 - ((mins ?? 0) % 15);
                            return nextMins <= 1
                                ? "Следующий тик · менее минуты"
                                : `Следующий тик · примерно через ${nextMins} мин`;
                        })()}
                    </div>
                )}
            </div>
        </Card>
    );
}
