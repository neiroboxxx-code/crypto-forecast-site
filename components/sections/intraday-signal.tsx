"use client";

import { useState } from "react";
import { getMicro, type MicroData } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { fmtProb, toneForDirection } from "@/lib/format";

function directionLabel(action: string, fallback: string): string {
    if (action === "enter_long") return "LONG";
    if (action === "avoid_long") return "AVOID";
    if (action === "neutral" || action === "no_trade") return "NEUTRAL";
    if (fallback === "up") return "LONG";
    if (fallback === "down") return "AVOID";
    return "NEUTRAL";
}

function signalAge(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60_000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    return `${hrs}h ago`;
}

export function IntradaySignal() {
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
                aria-label="Показать пояснение к Intraday Signal"
                className="group cursor-pointer rounded-2xl outline-none transition hover:ring-1 hover:ring-white/10 focus-visible:ring-1 focus-visible:ring-cyan-400/50"
            >
                <Card
                    title="Intraday Signal"
                    subtitle="24H Horizon"
                    right={<InfoIconButton onClick={openInfo} label="Показать пояснение" interactive={false} />}
                >
                    {loading && (
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <div className="grid grid-cols-2 gap-2">
                                <Skeleton className="h-14" />
                                <Skeleton className="h-14" />
                            </div>
                        </div>
                    )}

                    {error && <ErrorState message={error} />}

                    {data && (() => {
                        const action  = data.prediction.trade_action;
                        const dir     = data.prediction.prediction_direction;
                        const tone    = toneForDirection(action);
                        const label   = directionLabel(action, dir);
                        const pUp     = data.prediction.probability_up;
                        const pDown   = data.prediction.probability_down;
                        const conf    = data.prediction.confidence;
                        const predAt  = data.prediction.prediction_time;

                        const toneClass =
                            tone === "long"  ? "text-emerald-400" :
                            tone === "short" ? "text-rose-400"    : "text-cyan-300";

                        const confLabel =
                            conf >= 0.35 ? "HIGH" :
                            conf >= 0.20 ? "MEDIUM" : "LOW";

                        const confColor =
                            conf >= 0.35 ? "text-emerald-400" :
                            conf >= 0.20 ? "text-amber-400"   : "text-white/50";

                        return (
                            <>
                                {/* ── Main direction label ── */}
                                <div className="rounded-lg border border-white/8 bg-black/30 p-3 text-center">
                                    <div className={`text-3xl font-bold tracking-tight ${toneClass}`}>
                                        {label}
                                    </div>
                                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                                        24H Bias
                                    </div>
                                </div>

                                {/* ── Confidence + Age ── */}
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border border-white/8 bg-black/30 p-2.5">
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                                            Confidence
                                        </div>
                                        <div className={`mt-1 text-xl font-semibold tabular-nums ${confColor}`}>
                                            {confLabel}
                                        </div>
                                        <div className="mt-0.5 text-[10px] tabular-nums text-white/35">
                                            {fmtProb(conf)} spread
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-white/8 bg-black/30 p-2.5">
                                        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                                            Updated
                                        </div>
                                        <div className="mt-1 text-sm font-medium text-white/75">
                                            {signalAge(predAt)}
                                        </div>
                                        <div className="mt-0.5 text-[10px] text-white/35">
                                            ~1H refresh
                                        </div>
                                    </div>
                                </div>

                                {/* ── Probability bar ── */}
                                <div className="mt-2 space-y-1.5">
                                    {/* bar */}
                                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/8">
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-l-full bg-emerald-400/70 transition-all duration-500"
                                            style={{ width: `${pUp * 100}%` }}
                                        />
                                        <div
                                            className="absolute inset-y-0 right-0 rounded-r-full bg-rose-400/70 transition-all duration-500"
                                            style={{ width: `${pDown * 100}%` }}
                                        />
                                        {/* midpoint marker */}
                                        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-px bg-white/25" />
                                    </div>
                                    {/* labels under bar */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-semibold tabular-nums text-emerald-400">
                                            ↑ {fmtProb(pUp)}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-[0.12em] text-white/30">
                                            P(up) / P(down)
                                        </span>
                                        <span className="text-[11px] font-semibold tabular-nums text-rose-400">
                                            {fmtProb(pDown)} ↓
                                        </span>
                                    </div>
                                </div>

                                {/* ── Top factor (if available) ── */}
                                {data.prediction.factors && data.prediction.factors.length > 0 && (() => {
                                    const top = data.prediction.factors
                                        .filter(f => f.signal !== "neutral")
                                        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))[0];
                                    if (!top) return null;
                                    const isPos = top.contribution > 0;
                                    return (
                                        <p className="mt-2 border-t border-white/6 pt-2 text-[11px] leading-5 text-white/45">
                                            <span className="text-white/60">Key signal: </span>
                                            <span className={isPos ? "text-emerald-400/80" : "text-rose-400/80"}>
                                                {top.name}
                                            </span>
                                            {" "}({top.signal})
                                        </p>
                                    );
                                })()}
                            </>
                        );
                    })()}
                </Card>
            </div>

            <InfoDialog
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                title="Intraday Signal"
                subtitle="Прогноз направления BTC на ближайшие 24 часа"
            >
                <p>
                    Тактический сигнал на 24 часа. Пять взвешенных факторов формируют итоговую вероятность
                    роста и падения. Чем сильнее перевес одной стороны — тем выше уверенность.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Факторы модели
                </h4>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-5">
                    <li><span className="font-semibold text-white">Sweep Signal ×2.0</span> — свип пула ликвидности. Самый сильный сигнал: тень пробивает уровень, тело закрывается обратно.</li>
                    <li><span className="font-semibold text-white">Volume Spike ×1.5</span> — всплеск объёма с направленным давлением (быки/медведи).</li>
                    <li><span className="font-semibold text-white">HTF Macro Bias ×1.5</span> — еженедельный/месячный биас из HTF Engine (bullish / bearish / range).</li>
                    <li><span className="font-semibold text-white">RSI Position ×1.0</span> — позиция RSI-14 по часовым свечам: зоны перекупленности/перепроданности.</li>
                    <li><span className="font-semibold text-white">ATR State ×0.5</span> — соотношение волатильности к ATR-14; выявляет истощение диапазона.</li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Что показывают блоки
                </h4>
                <ul className="mt-2 space-y-2">
                    <li>
                        <span className="font-semibold text-white">24H Bias</span> — итоговое направление.{" "}
                        <span className="text-emerald-400">LONG</span> — ждём рост,{" "}
                        <span className="text-rose-400">AVOID</span> — ждём падение,{" "}
                        <span className="text-cyan-300">NEUTRAL</span> — сигнал слишком слабый, лучше подождать.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Confidence</span> — качество сигнала: HIGH / MEDIUM / LOW.
                        Ниже 20% разрыва вероятностей модель возвращает NEUTRAL.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Updated</span> — сколько времени прошло с последнего расчёта.
                        Данные обновляются ~раз в час при запросе страницы.
                    </li>
                    <li>
                        Полоска <span className="text-emerald-400 font-semibold">P(up)</span> / <span className="text-rose-400 font-semibold">P(down)</span> —
                        визуальный баланс вероятностей. Центральная метка — 50/50.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Key signal</span> — фактор с наибольшим весовым вкладом в текущий сигнал.
                    </li>
                </ul>

                <p className="mt-3 text-xs text-white/50">
                    Это не финансовый совет. Сигнал — один из инструментов анализа, а не готовая торговая рекомендация.
                </p>
            </InfoDialog>
        </>
    );
}
