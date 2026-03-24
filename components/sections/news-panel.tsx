"use client";

import { useState } from "react";
import newsData from "@/data/latest-news.json";

type NewsItem = (typeof newsData.items)[number];

function formatTime(value: string) {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatMetric(value: number | null | undefined, digits = 2) {
    if (value === null || value === undefined) return "—";
    return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

function sentimentLabel(sentiment: NewsItem["sentiment"]) {
    if (typeof sentiment === "number") {
        if (sentiment > 0.12) return "Позитив";
        if (sentiment < -0.12) return "Негатив";
        return "Нейтрально";
    }

    if (sentiment === "bullish") return "Позитив";
    if (sentiment === "bearish") return "Негатив";
    return "Нейтрально";
}

function sentimentClass(sentiment: NewsItem["sentiment"]) {
    if (typeof sentiment === "number") {
        if (sentiment > 0.12) {
            return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
        }

        if (sentiment < -0.12) {
            return "border-red-400/20 bg-red-400/10 text-red-200";
        }

        return "border-white/10 bg-white/5 text-white/70";
    }

    if (sentiment === "bullish") {
        return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
    }

    if (sentiment === "bearish") {
        return "border-red-400/20 bg-red-400/10 text-red-200";
    }

    return "border-white/10 bg-white/5 text-white/70";
}

function regimeLabel(value: string | null | undefined) {
    if (value === "risk_off") return "Risk-off";
    if (value === "risk_on") return "Risk-on";
    if (value === "macro_uncertainty") return "Макро-неопределённость";
    return "Нейтрально";
}

function regimeClass(value: string | null | undefined) {
    if (value === "risk_off") {
        return "border-amber-400/20 bg-amber-400/10 text-amber-200";
    }

    if (value === "risk_on") {
        return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
    }

    if (value === "macro_uncertainty") {
        return "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200";
    }

    return "border-white/10 bg-white/5 text-white/70";
}

function sourceLayerLabel(value: string | null | undefined) {
    if (value === "global_primary") return "Global";
    if (value === "global_secondary") return "Global";
    if (value === "ru_confirmation") return "РБК";
    return "Источник";
}

export function NewsPanel() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm md:p-7">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                        Новости
                    </div>

                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                        Подтверждённые события
                    </h2>

                    <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
                        Здесь показаны события, которые уже подтверждены global и confirmation
                        layer.
                    </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-right">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Обновлено
                    </div>

                    <div className="mt-2 text-sm font-medium text-white">
                        {formatTime(newsData.updated_at)}
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                        Confirmed events
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                        {newsData.features.confirmed_events_count}
                    </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200/70">
                        Risk-off pressure
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-amber-100">
                        {formatMetric(newsData.features.risk_off_pressure, 4)}
                    </div>
                </div>

                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-fuchsia-200/70">
                        Avg BTC relevance
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-fuchsia-100">
                        {formatMetric(newsData.features.avg_confirmed_btc_relevance, 2)}
                    </div>
                </div>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">
                        Oil shock count
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-cyan-100">
                        {newsData.features.oil_shock_count}
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">
                    Контекст сигнала
                </div>

                <p className="mt-3 text-sm leading-7 text-white/64">
                    {newsData.signal_context.summary}
                </p>
            </div>

            <div className="mt-6 space-y-3">
                {newsData.items.map((item, index) => {
                    const isOpen = openIndex === index;

                    return (
                        <article
                            key={`${item.event_key ?? item.url ?? item.title}-${item.published_at ?? index}`}
                            className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-white/12"
                        >
                            <button
                                type="button"
                                onClick={() => setOpenIndex(isOpen ? null : index)}
                                className="w-full text-left"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                                                {sourceLayerLabel(item.source_layer)}
                                            </span>

                                            <span
                                                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${regimeClass(
                                                    item.market_regime_effect
                                                )}`}
                                            >
                                                {regimeLabel(item.market_regime_effect)}
                                            </span>

                                            <span
                                                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${sentimentClass(
                                                    item.sentiment
                                                )}`}
                                            >
                                                {sentimentLabel(item.sentiment)}
                                            </span>

                                            {item.is_confirmed && (
                                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200">
                                                    Confirmed
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="mt-4 text-lg font-medium leading-7 text-white">
                                            {item.title}
                                        </h3>
                                    </div>

                                    <div className="mt-1 shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/56">
                                        {isOpen ? "Свернуть" : "Открыть"}
                                    </div>
                                </div>
                            </button>

                            {isOpen && (
                                <div className="mt-4 border-t border-white/8 pt-4">
                                    <p className="text-sm leading-7 text-white/62">
                                        {item.summary}
                                    </p>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                                                Impact
                                            </div>
                                            <div className="mt-2 text-base font-medium text-white">
                                                {formatMetric(item.impact_score, 2)}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                                                BTC relevance
                                            </div>
                                            <div className="mt-2 text-base font-medium text-white">
                                                {formatMetric(item.btc_relevance_score, 2)}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
                                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
                                                Event key
                                            </div>
                                            <div className="mt-2 break-all text-sm font-medium text-white">
                                                {item.event_key || "—"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                        <div className="text-sm text-white/45">
                                            {item.source} • {formatTime(item.published_at)}
                                        </div>

                                        {item.url ? (
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72 transition hover:bg-white/10"
                                            >
                                                Открыть источник
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}