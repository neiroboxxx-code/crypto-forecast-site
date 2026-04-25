"use client";

import { useState } from "react";
import { getMicro, type MicroData } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { fmtConfidence, fmtProb, toneForDirection } from "@/lib/format";

function directionLabel(action: string, fallback: string): string {
    if (action === "enter_long") return "LONG";
    if (action === "avoid_long") return "AVOID";
    if (action === "no_trade") return "WAIT";
    if (fallback === "up") return "LONG";
    if (fallback === "down") return "SHORT";
    return "WAIT";
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
                            <div className="grid grid-cols-2 gap-2">
                                <Skeleton className="h-14" />
                                <Skeleton className="h-14" />
                            </div>
                        </div>
                    )}

                    {error && <ErrorState message={error} />}

                    {data && (
                        <>
                            <div className="rounded-lg border border-white/8 bg-black/30 p-3 text-center">
                                {(() => {
                                    const action = data.prediction.trade_action;
                                    const dir = data.prediction.prediction_direction;
                                    const tone = toneForDirection(action);
                                    const label = directionLabel(action, dir);
                                    const toneClass =
                                        tone === "long"
                                            ? "text-emerald-400"
                                            : tone === "short"
                                            ? "text-rose-400"
                                            : "text-cyan-300";
                                    return (
                                        <div className={`text-3xl font-bold tracking-tight ${toneClass}`}>
                                            {label}
                                        </div>
                                    );
                                })()}
                                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                                    24H Bias
                                </div>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-white/8 bg-black/30 p-2.5">
                                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                                        Confidence
                                    </div>
                                    <div className="mt-1 text-xl font-semibold tabular-nums text-white">
                                        {fmtConfidence(data.prediction.confidence)}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-white/8 bg-black/30 p-2.5">
                                    <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">
                                        Model
                                    </div>
                                    <div className="mt-1 truncate text-xs font-medium text-white/75">
                                        {data.prediction.model_version.replace("baseline_", "v")}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-2.5">
                                    <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-300/70">
                                        P(Up)
                                    </div>
                                    <div className="mt-1 text-xl font-semibold tabular-nums text-emerald-400">
                                        {fmtProb(data.prediction.probability_up)}
                                    </div>
                                </div>
                                <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] p-2.5">
                                    <div className="text-[10px] uppercase tracking-[0.14em] text-rose-300/70">
                                        P(Down)
                                    </div>
                                    <div className="mt-1 text-xl font-semibold tabular-nums text-rose-400">
                                        {fmtProb(data.prediction.probability_down)}
                                    </div>
                                </div>
                            </div>

                            {data.prediction.notes && (
                                <p className="mt-3 border-t border-white/6 pt-2 text-[11px] leading-5 text-white/50">
                                    {data.prediction.notes.split(" | ")[0]}
                                </p>
                            )}
                        </>
                    )}
                </Card>
            </div>

            <InfoDialog
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                title="Intraday Signal"
                subtitle="Прогноз направления BTC на ближайшие 24 часа"
            >
                <p>
                    Это короткий тактический сигнал. Модель смотрит на последние 24 часовые
                    свечи BTC и оценивает, куда вероятнее пойдёт цена в течение следующих суток.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Что показывают блоки
                </h4>
                <ul className="mt-2 space-y-2">
                    <li>
                        <span className="font-semibold text-white">24H Bias</span> — итоговое
                        направление на горизонт 24 часа. <span className="text-emerald-400">LONG</span>{" "}
                        — модель ждёт рост, <span className="text-rose-400">SHORT / AVOID</span>{" "}
                        — падение или не лонговать, <span className="text-cyan-300">WAIT</span>{" "}
                        — сигнал слишком слабый, лучше подождать.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Confidence</span> — уверенность
                        модели в сигнале: разница между вероятностями роста и падения. Чем выше,
                        тем сильнее перевес одной стороны. Ниже ~22% сигнал считается слишком
                        слабым и превращается в WAIT.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Model</span> — версия модели,
                        которая посчитала прогноз. Полезно, чтобы понимать, на каком алгоритме
                        построен сигнал, и сравнивать результаты между версиями.
                    </li>
                    <li>
                        <span className="font-semibold text-emerald-400">P(Up)</span> и{" "}
                        <span className="font-semibold text-rose-400">P(Down)</span> — вероятности
                        роста и падения цены в ближайшие 24 часа. Всегда в сумме дают 100%.
                    </li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Откуда берутся цифры
                </h4>
                <p className="mt-2">
                    Движок считает изменение цены за 1 час и за 24 часа, средний объём, всплески
                    объёма, волатильность и ATR. Отдельно проверяет ценовое действие — свипы
                    пулов ликвидности (когда тень свечи пробивает уровень, но тело закрывается
                    обратно). Подтверждённый свип — самый сильный сигнал и даёт наибольший сдвиг
                    вероятности.
                </p>

                <p className="mt-3 text-xs text-white/50">
                    Это не финансовый совет. Сигнал — один из инструментов анализа, а не
                    готовая торговая рекомендация.
                </p>
            </InfoDialog>
        </>
    );
}
