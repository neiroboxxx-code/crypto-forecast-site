import signalData from "@/data/latest-signal.json";

type SignalData = typeof signalData;

function formatDirection(direction: SignalData["prediction_direction"]) {
    if (direction === "up") return "LONG";
    if (direction === "down") return "SHORT";
    return "WAIT";
}

function directionClass(direction: SignalData["prediction_direction"]) {
    if (direction === "up") return "text-emerald-300";
    if (direction === "down") return "text-red-300";
    return "text-cyan-200";
}

function formatRecommendation(direction: SignalData["prediction_direction"]) {
    if (direction === "up") return "Смотреть лонг";
    if (direction === "down") return "Смотреть шорт";
    return "Ждать";
}

function confidenceLabel(value: number) {
    if (value < 25) return "Слабое подтверждение";
    if (value < 50) return "Осторожный сетап";
    if (value < 75) return "Сетап выглядит уверенно";
    return "Сильный рабочий сетап";
}

function formatPrice(value: number) {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
    }).format(value);
}

function formatPercent(value: number) {
    return `${Math.round(value * 100)}%`;
}

function formatDisplayPercent(value: number) {
    return `${Math.round(value * 100)}%`;
}

function formatRawPercent(value: number) {
    return `${Math.round(value)}%`;
}

function formatTime(value: string) {
    const date = new Date(value);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}.${month} ${hours}:${minutes}`;
}

function trendLabel(direction: string) {
    if (direction === "sideways") return "Флэт";
    if (direction === "bullish") return "Лонговый уклон";
    if (direction === "bearish") return "Шортовый уклон";
    return direction;
}

function trendStrengthLabel(value: number) {
    if (value < 0.15) return "Рынок вялый";
    if (value < 0.35) return "Импульс слабый";
    if (value < 0.65) return "Импульс рабочий";
    return "Импульс сильный";
}

function rsiLabel(value: number) {
    if (value < 30) return "зона перепроданности";
    if (value > 70) return "зона перекупленности";
    return "нейтральная зона";
}

function marketToneLabel(direction: SignalData["prediction_direction"]) {
    if (direction === "up") return "Лонговый приоритет";
    if (direction === "down") return "Шортовый приоритет";
    return "Активный сценарий";
}

export function SignalOverview() {
    const direction = formatDirection(signalData.prediction_direction);
    const recommendation =
        signalData.market_recommendation ||
        formatRecommendation(signalData.prediction_direction);

    return (
        <section className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm md:p-6">
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr_0.95fr]">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="text-center text-[11px] uppercase tracking-[0.22em] text-white/42">
                        Текущий сигнал
                    </div>

                    <div className="mt-4 flex flex-col items-center">
                        <div
                            className={`text-[54px] font-semibold leading-none tracking-[-0.06em] ${directionClass(
                                signalData.prediction_direction
                            )}`}
                        >
                            {direction}
                        </div>

                        <div className="mt-4 text-center text-[15px] leading-8 text-cyan-200">
                            {marketToneLabel(signalData.prediction_direction)} на 24 часа
                        </div>

                        <div className="mt-4 text-sm uppercase tracking-[0.22em] text-white/34">
                            BTCUSDT
                        </div>
                    </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="text-center text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Уровень сигнала
                    </div>

                    <div className="mt-4 text-center">
                        <div className="text-[54px] font-semibold leading-none tracking-[-0.06em] text-white">
                            {formatRawPercent(signalData.confidence)}
                        </div>

                        <div className="mt-4 text-[15px] leading-8 text-white/62">
                            {confidenceLabel(signalData.confidence)}
                        </div>
                    </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="text-center text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Последнее обновление
                    </div>

                    <div className="mt-4 text-center">
                        <div className="text-[52px] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
                            {formatTime(signalData.updated_at)}
                        </div>

                        <div className="mt-4 text-[15px] leading-8 text-white/50">
                            Актуальный снимок данных
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Текущая цена
                    </div>
                    <div className="mt-2 text-xl font-medium text-white">
                        ${formatPrice(signalData.current_price)}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Рыночная идея
                    </div>
                    <div className="mt-2 text-xl font-medium text-white">
                        {recommendation}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Вероятность роста
                    </div>
                    <div className="mt-2 text-xl font-medium text-white">
                        {formatPercent(signalData.probability_up)}
                    </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Вероятность снижения
                    </div>
                    <div className="mt-2 text-xl font-medium text-white">
                        {formatPercent(signalData.probability_down)}
                    </div>
                </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Краткий вывод
                </div>

                <p className="mt-3 text-sm leading-7 text-white/64">
                    {signalData.summary}
                </p>
            </div>

            <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Уровни
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                Ближайшая поддержка
                            </div>
                            <div className="mt-2 text-lg font-medium text-white">
                                ${formatPrice(signalData.levels.nearest_support)}
                            </div>
                            <div className="mt-2 text-sm text-white/50">
                                Расстояние:{" "}
                                {formatDisplayPercent(signalData.levels.support_distance_pct)}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                                Ближайшее сопротивление
                            </div>
                            <div className="mt-2 text-lg font-medium text-white">
                                ${formatPrice(signalData.levels.nearest_resistance)}
                            </div>
                            <div className="mt-2 text-sm text-white/50">
                                Расстояние:{" "}
                                {formatDisplayPercent(signalData.levels.resistance_distance_pct)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                            Структура тренда
                        </div>

                        <div className="mt-3 text-xl font-medium text-white">
                            {trendLabel(signalData.trend_structure.trend_direction)}
                        </div>

                        <div className="mt-3 space-y-2 text-sm leading-7 text-white/56">
                            <div>{trendStrengthLabel(signalData.trend_structure.trend_strength)}</div>
                            <div>Серия хаёв: {signalData.trend_structure.higher_highs}</div>
                            <div>Серия лоёв: {signalData.trend_structure.higher_lows}</div>
                            <div>
                                Глубина отката:{" "}
                                {formatRawPercent(signalData.trend_structure.pullback_depth_pct)}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                            Рыночный контекст
                        </div>

                        <div className="mt-3 space-y-2 text-sm leading-7 text-white/56">
                            <div>
                                RSI {signalData.market.rsi_14} — {rsiLabel(signalData.market.rsi_14)}
                            </div>
                            <div>
                                ATR {signalData.market.atr_14} — текущая амплитуда движения
                            </div>
                            <div>
                                Волатильность 24ч: {signalData.market.volatility_24h} — текущая
                                рыночная подвижность
                            </div>
                            <div>
                                Momentum: {signalData.market.momentum_10} — сила краткосрочного
                                импульса
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}