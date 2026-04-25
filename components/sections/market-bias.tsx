"use client";

import { useState } from "react";
import { getMicro, type MicroData } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card, StatCell } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { fmtPctFraction, fmtPrice, fmtProb } from "@/lib/format";

function volumeTone(ratio: number): "long" | "warn" | "default" {
    if (ratio >= 1.1) return "long";
    if (ratio < 0.7) return "warn";
    return "default";
}

function volumeSub(ratio: number): string {
    if (ratio >= 1.5) return "Heavy activity";
    if (ratio >= 1.1) return "Above baseline";
    if (ratio < 0.5) return "Very thin";
    if (ratio < 0.9) return "Below baseline";
    return "At baseline";
}

export function MarketBias() {
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
                aria-label="Показать пояснение к Market Bias"
                className="group cursor-pointer rounded-2xl outline-none transition hover:ring-1 hover:ring-white/10 focus-visible:ring-1 focus-visible:ring-cyan-400/50"
            >
                <Card
                    title="Market Bias"
                    subtitle="Snapshot · 1H"
                    right={<InfoIconButton onClick={openInfo} label="Показать пояснение" interactive={false} />}
                >
                    {loading && (
                        <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </div>
                    )}

                    {error && <ErrorState message={error} />}

                    {data && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <StatCell
                                    label="Last Price"
                                    value={`$${fmtPrice(data.prediction.current_price, 1)}`}
                                />
                                <StatCell
                                    label="24h Δ"
                                    value={fmtPctFraction(data.features.price_change_24h)}
                                    tone={data.features.price_change_24h >= 0 ? "long" : "short"}
                                />
                                <StatCell
                                    label="1h Δ"
                                    value={fmtPctFraction(data.features.price_change_1h)}
                                    tone={data.features.price_change_1h >= 0 ? "long" : "short"}
                                />
                                <StatCell
                                    label="ATR-14"
                                    value={data.features.atr_14.toFixed(0)}
                                    sub="Range proxy"
                                />
                            </div>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <StatCell
                                    label="P(Up)"
                                    value={fmtProb(data.prediction.probability_up)}
                                    tone="long"
                                />
                                <StatCell
                                    label="P(Down)"
                                    value={fmtProb(data.prediction.probability_down)}
                                    tone="short"
                                />
                                <StatCell
                                    label="Volume ratio"
                                    value={data.features.volume_ratio_10.toFixed(2)}
                                    sub={volumeSub(data.features.volume_ratio_10)}
                                    tone={volumeTone(data.features.volume_ratio_10)}
                                />
                                <StatCell
                                    label="Volatility 24h"
                                    value={data.features.volatility_24h.toFixed(0)}
                                />
                            </div>
                        </>
                    )}
                </Card>
            </div>

            <InfoDialog
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                title="Market Bias"
                subtitle="Моментальный срез рынка на 1-часовом таймфрейме"
            >
                <p>
                    Здесь собран быстрый «снимок» состояния рынка прямо сейчас: текущая цена,
                    движение за последний час и сутки, волатильность, объём и вероятности
                    направления от модели. Блок помогает за секунду понять фон, на котором
                    формируется сигнал.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Верхний ряд — цена и движение
                </h4>
                <ul className="mt-2 space-y-2">
                    <li>
                        <span className="font-semibold text-white">Last Price</span> — последняя
                        цена BTC по закрытию часовой свечи.
                    </li>
                    <li>
                        <span className="font-semibold text-white">24h Δ</span> — изменение цены
                        за последние 24 часа в процентах.{" "}
                        <span className="text-emerald-400">Зелёный</span> — рост,{" "}
                        <span className="text-rose-400">красный</span> — падение.
                    </li>
                    <li>
                        <span className="font-semibold text-white">1h Δ</span> — изменение за
                        последний час. Показывает свежий импульс, пока 24-часовой тренд может
                        быть уже «уставшим».
                    </li>
                    <li>
                        <span className="font-semibold text-white">ATR-14</span> — средний размах
                        свечи за последние 14 часов. Это прокси волатильности: чем выше ATR, тем
                        шире ходит рынок и тем больше «шум».
                    </li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Нижний ряд — вероятности и объём
                </h4>
                <ul className="mt-2 space-y-2">
                    <li>
                        <span className="font-semibold text-emerald-400">P(Up)</span> и{" "}
                        <span className="font-semibold text-rose-400">P(Down)</span> — вероятности
                        роста и падения на горизонт 24 часа (в сумме 100%). Те же самые числа,
                        что в Intraday Signal, — здесь продублированы для удобства сравнения.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Volume ratio</span> — объём
                        последней свечи, делённый на средний объём за 10 предыдущих. 1.00 — объём
                        «средний», &gt;1.10 — активность выше нормы, &gt;1.50 — явный всплеск,
                        &lt;0.70 — рынок «тонкий». Высокий объём усиливает доверие к сигналу,
                        низкий — ослабляет.
                    </li>
                    <li>
                        <span className="font-semibold text-white">Volatility 24h</span> —
                        стандартное отклонение цен закрытия за последние сутки. Чем выше число,
                        тем более «нервный» рынок: сигналы на таком фоне нужно фильтровать
                        жёстче.
                    </li>
                </ul>

                <p className="mt-4 text-xs text-white/50">
                    Совет: если 24h Δ и 1h Δ разнонаправленны, а volume ratio ниже 1.0 — скорее
                    всего, импульс угасает и рынок консолидируется.
                </p>
            </InfoDialog>
        </>
    );
}
