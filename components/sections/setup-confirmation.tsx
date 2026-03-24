import signalData from "@/data/latest-signal.json";

function yesNo(value: boolean) {
    return value ? "Да" : "Нет";
}

function formatTime(value: string) {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatNumber(value: number, digits = 2) {
    return new Intl.NumberFormat("ru-RU", {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
    }).format(value);
}

function formatPercent(value: number, digits = 1) {
    return `${formatNumber(value, digits)}%`;
}

function trendLabel(value: string) {
    if (value === "sideways") return "Пила";
    if (value === "bullish") return "Лонговый уклон";
    if (value === "bearish") return "Шортовый уклон";
    return value;
}

function strengthLabel(value: number) {
    if (value < 0.15) return "Рынок ватный";
    if (value < 0.35) return "Импульс слабый";
    if (value < 0.65) return "Импульс рабочий";
    return "Импульс мощный";
}

function volumeContext() {
    const ratio = signalData.market.volume_ratio_10;

    if (ratio < 0.5) return "Объём сильно ниже базы";
    if (ratio < 0.9) return "Объём ниже базы";
    if (ratio <= 1.1) return "Объём в норме";
    return "Объём выше базы";
}

function activeSignals() {
    const items: string[] = [];

    if (signalData.price_action.near_support_test) items.push("Тест поддержки");
    if (signalData.price_action.near_resistance_test) items.push("Тест сопротивления");
    if (signalData.price_action.pullback_recovery) items.push("Откуп после отката");
    if (signalData.price_action.rejection_back_inside) items.push("Возврат в диапазон");
    if (signalData.price_action.bullish_hold_near_support) items.push("Удержание у поддержки");
    if (signalData.price_action.bearish_hold_near_resistance) items.push("Удержание у сопротивления");
    if (signalData.price_action.bullish_continuation_into_resistance) items.push("Дожим в сопротивление");
    if (signalData.price_action.bearish_continuation_into_support) items.push("Дожим в поддержку");

    return items;
}

function candlePatternRows() {
    return [
        ["Бычье поглощение", signalData.setup_confirmation.candle_patterns.bullish_engulfing],
        ["Медвежье поглощение", signalData.setup_confirmation.candle_patterns.bearish_engulfing],
        ["Доджи", signalData.setup_confirmation.candle_patterns.doji],
        ["Молот", signalData.setup_confirmation.candle_patterns.hammer],
        [
            "2-свечное бычье продолжение",
            signalData.setup_confirmation.multi_candle_patterns.bullish_two_candle_continuation,
        ],
        [
            "2-свечное медвежье продолжение",
            signalData.setup_confirmation.multi_candle_patterns.bearish_two_candle_continuation,
        ],
    ];
}

export function SetupConfirmation() {
    const signals = activeSignals();

    return (
        <section className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm md:p-7">
            <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                    Подтверждение сигнала
                </div>

                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                    Паттерны • Тренд • Объём
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <p className="max-w-2xl text-sm leading-7 text-white/58">
                        Последний актуальный снимок рынка: свечные сигналы, структура тренда и
                        объём в моменте.
                    </p>

                    <div className="inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
                        {formatTime(signalData.updated_at)}
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4">
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Свечные паттерны
                    </div>

                    <div className="mt-4 space-y-3">
                        {candlePatternRows().map(([label, value]) => (
                            <div
                                key={label}
                                className="flex items-center justify-between border-b border-white/6 pb-3 last:border-b-0 last:pb-0"
                            >
                                <span className="text-sm text-white/66">{label}</span>

                                <span
                                    className={
                                        value
                                            ? "rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                                            : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                                    }
                                >
                                    {yesNo(Boolean(value))}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Рабочие триггеры по цене
                    </div>

                    <div className="mt-4">
                        {signals.length > 0 ? (
                            <div className="flex flex-wrap items-center justify-center gap-3">
                                {signals.map((item) => (
                                    <span
                                        key={item}
                                        className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-2 text-sm text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.10)]"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-sm text-white/55">
                                Явных триггеров сейчас нет.
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                            Структура тренда
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/6 pb-3">
                                <span className="text-sm text-white/60">Режим</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {trendLabel(signalData.trend_structure.trend_direction)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-white/6 pb-3">
                                <span className="text-sm text-white/60">Импульс</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {strengthLabel(signalData.trend_structure.trend_strength)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-white/6 pb-3">
                                <span className="text-sm text-white/60">Хаи</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {signalData.trend_structure.higher_highs}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-white/6 pb-3">
                                <span className="text-sm text-white/60">Лои</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {signalData.trend_structure.higher_lows}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-white/60">Откат</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {formatPercent(signalData.trend_structure.pullback_depth_pct, 1)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                            Объём в моменте
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between border-b border-white/6 pb-3">
                                <span className="text-sm text-white/60">Текущий бар</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {formatNumber(signalData.market.latest_volume)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-white/6 pb-3">
                                <span className="text-sm text-white/60">Среднее за 10</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {formatNumber(signalData.market.avg_volume_10)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-white/6 pb-3">
                                <span className="text-sm text-white/60">Коэф. объёма</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {formatNumber(signalData.market.volume_ratio_10, 2)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between border-b border-white/6 pb-3">
                                <span className="text-sm text-white/60">Ударный бар</span>
                                <span className="text-right text-sm font-medium text-white">
                                    {signalData.market.high_volume_bar ? "Да" : "Нет"}
                                </span>
                            </div>

                            <div className="pt-1 text-sm leading-7 text-white/58">
                                {volumeContext()}. Покупатель:{" "}
                                {signalData.market.bullish_volume_pressure ? "давит" : "не давит"}.{" "}
                                Продавец:{" "}
                                {signalData.market.bearish_volume_pressure ? "давит" : "не давит"}.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Вывод
                </div>

                <p className="mt-3 text-sm leading-7 text-white/60">
                    {signalData.setup_confirmation.interpretation}
                </p>
            </div>
        </section>
    );
}