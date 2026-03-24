"use client";

import { useEffect, useRef } from "react";

export function ChartPanel() {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

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
            backgroundColor: "rgba(6, 7, 10, 1)",
            gridColor: "rgba(255, 255, 255, 0.06)",
            studies: [],
            withdateranges: true,
            details: false,
            hotlist: false,
            watchlist: false,
        });

        widgetWrap.appendChild(widgetEl);
        widgetWrap.appendChild(script);
        containerRef.current.appendChild(widgetWrap);
    }, []);

    return (
        <section className="w-full rounded-[28px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between px-2 pt-1">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-white/42">
                        График
                    </div>
                    <div className="mt-1 text-sm text-white/68">BTCUSDT • Bybit Spot</div>
                </div>

                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                    Live
                </div>
            </div>

            <div
                ref={containerRef}
                className="h-[460px] w-full overflow-hidden rounded-[22px] border border-white/8 bg-[#05060a]"
            />
        </section>
    );
}