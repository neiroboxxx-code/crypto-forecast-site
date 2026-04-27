"use client";

import { getMicro, type MicroData, type LiquidityPool, type LiquiditySweep } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { fmtPrice } from "@/lib/format";

// ── Cluster близких уровней в один (в пределах 0.15%) ────────────────────

function clusterPools(pools: LiquidityPool[]): LiquidityPool[] {
    const sorted = [...pools].sort((a, b) => b.level - a.level);
    const clusters: LiquidityPool[] = [];
    for (const p of sorted) {
        const last = clusters[clusters.length - 1];
        if (last && last.pool_type === p.pool_type) {
            const distPct = Math.abs(last.level - p.level) / last.level;
            if (distPct < 0.0015) continue; // схлопываем в один
        }
        clusters.push(p);
    }
    return clusters;
}

// ── Найти свип для конкретного уровня ────────────────────────────────────

function findSweep(level: number, sweeps: LiquiditySweep[]): LiquiditySweep | null {
    return sweeps.find((s) => Math.abs(s.pool_level - level) < 1) ?? null;
}

// ── Компонент ─────────────────────────────────────────────────────────────

export function LiquidityPools() {
    const { data, loading, error } = useApi<MicroData>(getMicro, [], { intervalMs: 60_000 });

    if (loading) {
        return (
            <Card title="Liquidity Pools" subtitle="Ближайшие уровни ликвидности">
                <Skeleton className="h-48 w-full rounded-xl" />
            </Card>
        );
    }
    if (error) {
        return (
            <Card title="Liquidity Pools" subtitle="Ближайшие уровни ликвидности">
                <ErrorState message={error} />
            </Card>
        );
    }
    if (!data) return null;

    const currentPrice = data.prediction.current_price;
    const sweeps = data.price_action.recent_sweeps;
    const pools = clusterPools(data.price_action.active_pools);

    const above = pools
        .filter((p) => p.level > currentPrice)
        .sort((a, b) => a.level - b.level); // ближние сверху

    const below = pools
        .filter((p) => p.level <= currentPrice)
        .sort((a, b) => b.level - a.level); // ближние сверху

    const hasBullishSweep = data.price_action.bullish_sweep_detected === true || data.price_action.bullish_sweep_detected === 1;
    const hasBearishSweep = data.price_action.bearish_sweep_detected === true || data.price_action.bearish_sweep_detected === 1;

    return (
        <Card
            title="Liquidity Pools"
            subtitle="Уровни, где скопились стопы"
            padded
        >
            {/* Пояснение одной строкой */}
            <p className="mb-3 text-[11px] leading-relaxed text-white/45">
                Swing-экстремумы с повышенным объёмом — зоны скопления стоп-ордеров.
                Пробой с возвратом (свип) даёт торговый сигнал.
            </p>

            {/* Ценовая лестница */}
            <div className="flex flex-col gap-0.5">

                {/* Уровни выше цены — sell-side (сопротивление) */}
                {above.length > 0 && (
                    <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-rose-400/50">
                        sell-side · сопротивление
                    </div>
                )}
                {above.map((p) => {
                    const distPct = ((p.level - currentPrice) / currentPrice) * 100;
                    const sweep = findSweep(p.level, sweeps);
                    return (
                        <PoolRow
                            key={`${p.level}-${p.pool_type}`}
                            level={p.level}
                            distPct={distPct}
                            side="above"
                            sweep={sweep}
                        />
                    );
                })}

                {/* Текущая цена */}
                <div className="my-1 flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/15" />
                    <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-white/80">
                        ${fmtPrice(currentPrice)}
                    </span>
                    <span className="shrink-0 rounded bg-white/8 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/40">
                        NOW
                    </span>
                    <div className="h-px flex-1 bg-white/15" />
                </div>

                {/* Уровни ниже цены — buy-side (поддержка) */}
                {below.map((p) => {
                    const distPct = ((currentPrice - p.level) / currentPrice) * 100;
                    const sweep = findSweep(p.level, sweeps);
                    return (
                        <PoolRow
                            key={`${p.level}-${p.pool_type}`}
                            level={p.level}
                            distPct={distPct}
                            side="below"
                            sweep={sweep}
                        />
                    );
                })}
                {below.length > 0 && (
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-400/50">
                        buy-side · поддержка
                    </div>
                )}

            </div>

            {/* Статус свипов → влияние на сигнал */}
            <div className={`mt-3 rounded-xl border p-3 ${
                hasBullishSweep
                    ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                    : hasBearishSweep
                      ? "border-rose-500/25 bg-rose-500/[0.06]"
                      : "border-white/8 bg-black/20"
            }`}>
                <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    Влияние на сигнал
                </div>
                {hasBullishSweep && (
                    <div className="flex items-start gap-2">
                        <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                        <p className="text-[11px] leading-relaxed text-white/75">
                            Свип ниже поддержки — цена пробила уровень, но закрылась выше.
                            <span className="ml-1 font-semibold text-emerald-300">
                                Бычий сигнал +7% к вероятности лонга.
                            </span>
                        </p>
                    </div>
                )}
                {hasBearishSweep && (
                    <div className="flex items-start gap-2">
                        <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]" />
                        <p className="text-[11px] leading-relaxed text-white/75">
                            Свип выше сопротивления — цена пробила уровень, но закрылась ниже.
                            <span className="ml-1 font-semibold text-rose-300">
                                Медвежий сигнал +7% к вероятности шорта.
                            </span>
                        </p>
                    </div>
                )}
                {!hasBullishSweep && !hasBearishSweep && (
                    <p className="text-[11px] text-white/40">
                        Свипов нет — уровни нетронуты, нейтрально.
                    </p>
                )}
            </div>
        </Card>
    );
}

// ── Строка одного уровня ──────────────────────────────────────────────────

function PoolRow({
    level, distPct, side, sweep,
}: {
    level: number;
    distPct: number;
    side: "above" | "below";
    sweep: LiquiditySweep | null;
}) {
    const isAbove = side === "above";
    const wasSwept = !!sweep;

    return (
        <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition ${
            wasSwept
                ? sweep!.signal_bias === "bullish"
                    ? "bg-emerald-500/[0.07]"
                    : "bg-rose-500/[0.07]"
                : "hover:bg-white/[0.02]"
        }`}>
            {/* Цветной маркер уровня */}
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                wasSwept
                    ? sweep!.signal_bias === "bullish"
                        ? "bg-emerald-400"
                        : "bg-rose-400"
                    : isAbove
                      ? "bg-rose-400/40"
                      : "bg-emerald-400/40"
            }`} />

            {/* Цена */}
            <span className="flex-1 font-mono text-[12px] font-semibold tabular-nums text-white/85">
                ${fmtPrice(level)}
            </span>

            {/* Дистанция */}
            <span className={`font-mono text-[10px] tabular-nums ${
                isAbove ? "text-rose-300/70" : "text-emerald-300/70"
            }`}>
                {isAbove ? "+" : "-"}{distPct.toFixed(2)}%
            </span>

            {/* Свип бейдж */}
            {wasSwept && (
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                    sweep!.signal_bias === "bullish"
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-rose-400/15 text-rose-300"
                }`}>
                    swept
                </span>
            )}
        </div>
    );
}
