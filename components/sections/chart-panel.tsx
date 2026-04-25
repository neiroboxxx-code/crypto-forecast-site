"use client";

import { useEffect, useRef, useState } from "react";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { MarketThesisContent } from "./market-analysis";

export function ChartPanel() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [historicalInfoOpen, setHistoricalInfoOpen] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        const originalConsoleError = console.error;
        if (process.env.NODE_ENV !== "production") {
            console.error = (...args: unknown[]) => {
                const msg = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
                if (msg.includes("Cannot listen to the event from the provided iframe")) return;
                originalConsoleError(...args);
            };
        }

        containerRef.current.innerHTML = "";

        const widgetWrap = document.createElement("div");
        widgetWrap.className = "tradingview-widget-container h-full w-full";

        const widgetEl = document.createElement("div");
        widgetEl.className = "tradingview-widget-container__widget h-full w-full";

        const script = document.createElement("script");
        script.src =
            "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: "BYBIT:BTCUSDT",
            interval: "60",
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "ru",
            hide_top_toolbar: false,
            hide_legend: false,
            allow_symbol_change: false,
            save_image: false,
            calendar: false,
            support_host: "https://www.tradingview.com",
            backgroundColor: "rgba(10, 12, 18, 1)",
            gridColor: "rgba(255, 255, 255, 0.04)",
            studies: [],
            withdateranges: true,
            details: false,
            hotlist: false,
            watchlist: false,
        });

        widgetWrap.appendChild(widgetEl);
        widgetWrap.appendChild(script);
        containerRef.current.appendChild(widgetWrap);

        return () => {
            if (process.env.NODE_ENV !== "production") {
                console.error = originalConsoleError;
            }
            if (containerRef.current) containerRef.current.innerHTML = "";
        };
    }, []);

    return (
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0E1117]/80">
            {/* Chart zone — fixed height so it stays at its original, comfortable size */}
            <div className="flex h-[580px] w-full flex-col p-2">
                <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                            Chart
                        </span>
                        <span className="text-[11px] text-white/60">BTCUSDT · 1H</span>
                    </div>
                    <span className="flex items-center gap-1.5 rounded border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                        Live
                    </span>
                </div>

                <div
                    ref={containerRef}
                    className="w-full flex-1 overflow-hidden rounded-xl border border-white/6 bg-[#0A0C12]"
                />
            </div>

            {/* Protruding tab — attached to the chart's bottom border.
                Collapsed: label only. Expanded: accordion below pushes siblings down. */}
            <div className="flex items-center justify-center border-t border-white/8 bg-gradient-to-b from-transparent to-black/30 py-2">
                <button
                    type="button"
                    onClick={() => setAnalyticsOpen((v) => !v)}
                    aria-expanded={analyticsOpen}
                    aria-controls="chart-analytics-dropdown"
                    className="group flex h-11 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.03] px-5 text-[11px] uppercase tracking-[0.18em] text-white/65 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
                >
                    <span>Исторические события</span>
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 12 12"
                        className={`h-3 w-3 transition-transform duration-200 ${
                            analyticsOpen ? "rotate-180" : ""
                        }`}
                    >
                        <path
                            d="M2 4.5 L6 8.5 L10 4.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>

            {/* CSS-grid 1fr/0fr trick: pure-CSS height animation without measuring. */}
            <div
                id="chart-analytics-dropdown"
                className="grid border-t border-white/8 transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: analyticsOpen ? "minmax(0,1fr)" : "0fr" }}
            >
                <div className="min-h-0 overflow-hidden">
                    <div className="max-h-[460px] overflow-y-auto px-5 py-4">
                        {analyticsOpen && (
                            <>
                                <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/6 pb-3">
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                                            Исторические события
                                        </div>
                                        <p className="mt-0.5 text-[11px] leading-snug text-white/50">
                                            Контекст рынка по фактам с движка — см. пояснение справа.
                                        </p>
                                    </div>
                                    <InfoIconButton
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHistoricalInfoOpen(true);
                                        }}
                                        label="Что означает этот текст"
                                    />
                                </div>
                                <MarketThesisContent />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <InfoDialog
                open={historicalInfoOpen}
                onClose={() => setHistoricalInfoOpen(false)}
                title="Исторические события"
                subtitle="Откуда берётся текст под графиком"
            >
                <p>
                    Движок смотрит на рынок на горизонте примерно двух недель, проходит историю
                    свечей и фиксирует значимые развороты: те точки, где цена сменила характер
                    движения не «по ощущениям», а по заданным критериям структуры.
                </p>
                <p className="mt-3">
                    Вокруг каждого такого разворота он собирает необходимое окружение — объём,
                    волатильность, уровни, последовательность баров и другие сигналы с графика —
                    и отвечает на вопрос, какие именно триггеры могли повлиять на то, что рынок
                    развернулся. Это не комментарий «на глаз»: для каждого эпизода выполняется
                    математический расчёт, результат фиксируется и попадает в общую картину
                    контекста.
                </p>
                <p className="mt-3">
                    Уже на этой основе формируется связный рассказ о том, что происходило на рынке
                    в выбранном окне. Это не маркетинговый текст ради красивого абзаца: те же классы
                    показателей, что и в остальной аналитике платформы, только собранные в
                    повествование.
                </p>
                <p className="mt-3">
                    Нейросеть здесь узкая ступень: она переводит готовый набор фактов и величин в
                    читаемый человеческий язык — чтобы быстрее уловить суть, а не чтобы приукрасить
                    или «угадать настроение толпы». Числа и соотношения приходят из расчётов по
                    факту рынка.
                </p>
                <p className="mt-3 text-white/60">
                    Если хочется без посредника в виде текста, откройте соседние блоки дашборда:
                    там те же сигналы разложены по цифрам и вероятностям.
                </p>
            </InfoDialog>
        </section>
    );
}
