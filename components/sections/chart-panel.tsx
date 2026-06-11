"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, X } from "lucide-react";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { MarketThesisContent } from "./market-analysis";
import { KlineChart } from "@/components/chart/kline-chart";

const TIMEFRAMES = [
    { id: "1H", label: "1H" },
    { id: "4H", label: "4H" },
    { id: "D",  label: "D"  },
    { id: "W",  label: "W"  },
] as const;

type TF = typeof TIMEFRAMES[number]["id"];

export function ChartPanel() {
    const [interval, setInterval]                   = useState<TF>("1H");
    const [chartExpanded, setChartExpanded]         = useState(false);
    const [historicalOverlayOpen, setHistoricalOverlayOpen] = useState(false);
    const [historicalInfoOpen, setHistoricalInfoOpen]       = useState(false);

    const isClient = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );

    // Lock scroll when modal/expand is open
    useEffect(() => {
        if (!historicalOverlayOpen && !chartExpanded) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [historicalOverlayOpen, chartExpanded]);

    // Escape key
    useEffect(() => {
        if (!historicalOverlayOpen && !chartExpanded) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (historicalInfoOpen) return;
            if (historicalOverlayOpen) { setHistoricalOverlayOpen(false); return; }
            if (chartExpanded) setChartExpanded(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [historicalOverlayOpen, historicalInfoOpen, chartExpanded]);

    return (
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0E1117]/80">
            {/* ── Header ── */}
            <div className={`flex w-full flex-col p-2 transition-[min-height] duration-200 ${chartExpanded ? "min-h-[72px]" : "h-[580px]"}`}>
                <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5">
                    {/* Left: label + timeframe switcher */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                            Chart
                        </span>
                        <span className="text-[11px] text-white/40">BTCUSDT</span>
                        <div className="flex items-center gap-0.5 rounded-lg border border-white/8 bg-white/[0.03] p-0.5">
                            {TIMEFRAMES.map(tf => (
                                <button
                                    key={tf.id}
                                    type="button"
                                    onClick={() => setInterval(tf.id)}
                                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition
                                        ${interval === tf.id
                                            ? "bg-cyan-400/15 text-cyan-300"
                                            : "text-white/35 hover:text-white/65"
                                        }`}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: expand + live badge */}
                    <div className="flex items-center gap-2">
                        {!chartExpanded && (
                            <button
                                type="button"
                                onClick={() => setChartExpanded(true)}
                                title="Развернуть график"
                                aria-label="Развернуть график"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04] text-white/55 transition hover:border-cyan-400/35 hover:bg-cyan-400/[0.08] hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                            >
                                <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                        )}
                        <span className="flex items-center gap-1.5 rounded border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Live
                        </span>
                    </div>
                </div>

                {/* ── Chart body ── */}
                {chartExpanded ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#0A0C12]/80 px-4 py-3 text-center text-[12px] leading-snug text-white/45">
                        График открыт в увеличенном режиме. Закройте окно крестиком или нажмите «Свернуть».
                    </div>
                ) : (
                    // key={interval}: пересоздаём инстанс при смене ТФ — детерминированно
                    // убирает гонку getBars / зависание loadOverlays при setPeriod (§18.3).
                    <KlineChart
                        key={interval}
                        symbol="BTCUSDT"
                        interval={interval}
                        showToolbar
                        syncOverlays
                        className="w-full flex-1 overflow-hidden rounded-xl border border-white/6"
                    />
                )}
            </div>

            {/* ── Historical events button ── */}
            <div className="flex items-center justify-center border-t border-white/8 bg-gradient-to-b from-transparent to-black/30 py-2">
                <button
                    type="button"
                    onClick={() => setHistoricalOverlayOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={historicalOverlayOpen}
                    className="group flex h-11 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.03] px-5 text-[11px] uppercase tracking-[0.18em] text-white/65 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
                >
                    <span>Исторические события</span>
                    <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 opacity-70">
                        <path d="M2 3.5 L6 8 L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* ── Expand modal ── */}
            {isClient && chartExpanded && createPortal(
                <div
                    className="fixed inset-0 z-[98] flex items-center justify-center bg-black/82 p-2 backdrop-blur-[6px] sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="chart-expanded-title"
                >
                    <div className="flex h-[min(92dvh,960px)] w-full max-w-[min(1440px,calc(100vw-0.75rem))] min-h-0 flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0B0E14]/98 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.92)]">
                        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#080a10]/95 px-3 py-2.5 sm:px-5">
                            <div className="flex min-w-0 items-center gap-3">
                                <div>
                                    <h2 id="chart-expanded-title" className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                                        График
                                    </h2>
                                    <p className="mt-0.5 truncate text-[12px] text-white/55 sm:text-[13px]">
                                        BTCUSDT · {interval} · KlineCharts
                                    </p>
                                </div>
                                {/* Timeframe switcher in expanded mode */}
                                <div className="flex items-center gap-0.5 rounded-lg border border-white/8 bg-white/[0.03] p-0.5">
                                    {TIMEFRAMES.map(tf => (
                                        <button
                                            key={tf.id}
                                            type="button"
                                            onClick={() => setInterval(tf.id)}
                                            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition
                                                ${interval === tf.id
                                                    ? "bg-cyan-400/15 text-cyan-300"
                                                    : "text-white/35 hover:text-white/65"
                                                }`}
                                        >
                                            {tf.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setChartExpanded(false)}
                                    title="Свернуть в карточку"
                                    aria-label="Свернуть график"
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/14 bg-white/[0.05] px-2.5 text-[11px] font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 sm:px-3"
                                >
                                    <Minimize2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                    <span className="hidden sm:inline">Свернуть</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartExpanded(false)}
                                    aria-label="Закрыть"
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/14 bg-white/[0.05] text-white/85 transition hover:border-white/28 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                                >
                                    <X className="h-[17px] w-[17px]" strokeWidth={2} />
                                </button>
                            </div>
                        </header>
                        <KlineChart
                            key={interval}
                            symbol="BTCUSDT"
                            interval={interval}
                            showToolbar
                            syncOverlays
                            className="min-h-0 w-full flex-1 overflow-hidden"
                        />
                    </div>
                </div>,
                document.body,
            )}

            {/* ── Historical events modal ── */}
            {isClient && historicalOverlayOpen && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/78 p-3 backdrop-blur-[6px] sm:p-5"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="historical-events-title"
                >
                    <div className="relative flex max-h-[min(92vh,920px)] w-full max-w-[min(1080px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0B0E14]/97 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.04)]">
                        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-[#080a10]/95 px-4 py-3.5 sm:px-6">
                            <div className="min-w-0 pt-0.5">
                                <h2 id="historical-events-title" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                                    Исторические события
                                </h2>
                                <p className="mt-1 text-[13px] leading-snug text-white/55 sm:text-[14px]">
                                    Контекст рынка по фактам с движка — пояснение справа от заголовка.
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <InfoIconButton
                                    onClick={(e) => { e.stopPropagation(); setHistoricalInfoOpen(true); }}
                                    label="Что означает этот текст"
                                />
                                <button
                                    type="button"
                                    onClick={() => setHistoricalOverlayOpen(false)}
                                    aria-label="Закрыть"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/14 bg-white/[0.05] text-white/85 transition hover:border-white/28 hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                                >
                                    <X className="h-[18px] w-[18px]" strokeWidth={2} />
                                </button>
                            </div>
                        </header>
                        <div className="thesis-modal-scope min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
                            <MarketThesisContent density="comfortable" />
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            <InfoDialog
                open={historicalInfoOpen}
                onClose={() => setHistoricalInfoOpen(false)}
                title="Исторические события"
                subtitle="Откуда берётся текст в этом окне"
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
