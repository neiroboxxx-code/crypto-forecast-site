"use client";

import { useState } from "react";
import { getMicro, type MicroData } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { fmtPrice } from "@/lib/format";

function bool(v: number | boolean | undefined): boolean {
    return v === true || v === 1;
}

type Row = { label: string; active: boolean; kind: "long" | "short" | "neutral" };

function buildRows(data: MicroData): Row[] {
    const f = data.features;
    const pa = data.price_action;
    return [
        { label: "Bullish sweep", active: bool(pa.bullish_sweep_detected), kind: "long" },
        { label: "Bullish sweep · volume conf.", active: bool(pa.bullish_sweep_volume_confirmed), kind: "long" },
        { label: "Bearish sweep", active: bool(pa.bearish_sweep_detected), kind: "short" },
        { label: "Bearish sweep · volume conf.", active: bool(pa.bearish_sweep_volume_confirmed), kind: "short" },
        { label: "Buy pressure", active: bool(f.bullish_volume_pressure), kind: "long" },
        { label: "Sell pressure", active: bool(f.bearish_volume_pressure), kind: "short" },
        { label: "High volume bar", active: bool(f.high_volume_bar), kind: "neutral" },
        { label: "Volume ≥ baseline", active: f.volume_ratio_10 >= 1, kind: "neutral" },
        { label: "1h change positive", active: f.price_change_1h > 0, kind: "long" },
        { label: "24h change positive", active: f.price_change_24h > 0, kind: "long" },
    ];
}

function dotClass(active: boolean, kind: Row["kind"]): string {
    if (!active) return "border-white/15 bg-transparent";
    if (kind === "long") return "border-emerald-400/80 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]";
    if (kind === "short") return "border-rose-400/80 bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]";
    return "border-cyan-400/80 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]";
}

export function ConfluenceMatrix() {
    const { data, loading, error } = useApi<MicroData>(getMicro);
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
                aria-label="Показать пояснение к Confluence Matrix"
                className="group cursor-pointer rounded-2xl outline-none transition hover:ring-1 hover:ring-white/10 focus-visible:ring-1 focus-visible:ring-cyan-400/50"
            >
                <Card
                    title="Confluence Matrix"
                    subtitle="Signals in latest 1H bar"
                    right={<InfoIconButton onClick={openInfo} label="Показать пояснение" interactive={false} />}
                >
                    {loading && (
                        <div className="space-y-1.5">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <Skeleton key={i} className="h-6 w-full" />
                            ))}
                        </div>
                    )}

                    {error && <ErrorState message={error} />}

                    {data && (
                        <>
                            <div className="divide-y divide-white/6">
                                {buildRows(data).map((r) => (
                                    <div
                                        key={r.label}
                                        className="flex items-center justify-between py-1.5 text-[12px]"
                                    >
                                        <span className={r.active ? "text-white/85" : "text-white/40"}>
                                            {r.label}
                                        </span>
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full border transition ${dotClass(
                                                r.active,
                                                r.kind,
                                            )}`}
                                        />
                                    </div>
                                ))}
                            </div>

                            {data.price_action.active_pools.length > 0 && (
                                <div className="mt-3 border-t border-white/8 pt-2">
                                    <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-white/40">
                                        Liquidity pools
                                    </div>
                                    <div className="space-y-1">
                                        {data.price_action.active_pools.slice(0, 4).map((p, i) => (
                                            <div key={i} className="flex items-center justify-between text-[11px]">
                                                <span className="text-white/50">
                                                    {p.pool_type === "swing_high" ? "High" : "Low"}
                                                </span>
                                                <span className="tabular-nums text-white/80">
                                                    ${fmtPrice(p.level)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>

            <InfoDialog
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                title="Confluence Matrix"
                subtitle="Какие сигналы сработали на последней 1-часовой свече"
            >
                <p>
                    Это чек-лист из 10 пунктов. По каждому пункту проверяется одно условие на
                    свежей часовой свече. Если условие выполнено — точка справа загорается,
                    если нет — остаётся пустой. Чем больше точек одного цвета подсвечено, тем
                    выше «конфлюенция» (совпадение сигналов) в эту сторону.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Цвета точек
                </h4>
                <ul className="mt-2 space-y-1.5">
                    <li>
                        <span className="font-semibold text-emerald-400">Зелёная</span> — сигнал
                        в пользу роста (long).
                    </li>
                    <li>
                        <span className="font-semibold text-rose-400">Красная</span> — сигнал в
                        пользу падения (short).
                    </li>
                    <li>
                        <span className="font-semibold text-cyan-300">Голубая</span> —
                        нейтральный сигнал, усиливающий любую сторону (например, большой объём).
                    </li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Что означают пункты
                </h4>
                <ul className="mt-2 space-y-2">
                    <li>
                        <span className="font-semibold text-white">Bullish / Bearish sweep</span>{" "}
                        — тень свечи пробила уровень ликвидности (swing low / swing high), но
                        тело закрылось обратно. Это классический «снос стопов», после которого
                        цена часто идёт в противоположную сторону.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Sweep · volume conf.</span> —
                        свип подтверждён объёмом (volume ratio ≥ 1.4). Это самый сильный сигнал
                        на матрице — модель добавляет +7% к вероятности соответствующего
                        направления.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Buy / Sell pressure</span> —
                        свеча закрылась выше/ниже открытия и объём выше среднего (≥1.2). Говорит
                        о том, что движение подкреплено реальными покупателями/продавцами, а не
                        «тонкой ликвидностью».
                    </li>
                    <li>
                        <span className="font-semibold text-white">High volume bar</span> —
                        объём последней свечи ≥ 1.4× от среднего за 10 свечей. Нейтральный
                        маркер: внимание рынка к этому бару повышено.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Volume ≥ baseline</span> —
                        объём выше «обычного» уровня (volume ratio ≥ 1.0). Простой фильтр
                        «рынок не спит».
                    </li>
                    <li>
                        <span className="font-semibold text-white">1h / 24h change positive</span>{" "}
                        — цена выросла за последний час и/или за последние сутки. Если горят
                        оба — краткосрочный и среднесрочный импульс согласованы.
                    </li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Liquidity pools
                </h4>
                <p className="mt-2">
                    Внизу блока — до 4 ближайших пулов ликвидности: «High» и «Low». Это
                    локальные максимумы и минимумы за последние ~50 часов, под которыми обычно
                    скапливаются стопы. Именно эти уровни и сносят свипы выше по списку.
                </p>

                <p className="mt-4 text-xs text-white/50">
                    Как читать: если подсвечено несколько зелёных подряд и при этом нейтральные
                    объёмные — лонговый сценарий «на подтверждении». Смешанная картина (и
                    зелёные, и красные точки) — рынок без явного направления, лучше подождать.
                </p>
            </InfoDialog>
        </>
    );
}
