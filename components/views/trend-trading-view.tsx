"use client";

import { useState } from "react";
import { ScannerPanel } from "@/components/sections/scanner-panel";
import { HtfContextPanelStandalone } from "@/components/sections/htf-context-panel";
import { KlineChart } from "@/components/chart/kline-chart";
import { RefreshCw } from "lucide-react";

// ---------------------------------------------------------------------------
// Intervals
// ---------------------------------------------------------------------------

const INTERVALS = ["D", "W", "M", "4H"] as const;
type Interval = (typeof INTERVALS)[number];

function IntervalBtn({
    tf,
    active,
    onClick,
}: {
    tf: Interval;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-2.5 py-1 rounded text-[10px] font-medium uppercase tracking-wide transition-colors ${
                active
                    ? "bg-white/12 text-white border border-white/25"
                    : "text-white/35 border border-transparent hover:text-white/60 hover:border-white/12"
            }`}
        >
            {tf}
        </button>
    );
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function TrendTradingView() {
    const [symbol, setSymbol]   = useState("BTCUSDT");
    const [interval, setTf]     = useState<Interval>("D");
    const [refreshKey, setRefresh] = useState(0);

    return (
        <div className="space-y-4">

            {/* ── Page header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        Trend Trading
                    </h1>
                    <p className="mt-0.5 text-[11px] text-white/30">
                        HTF сканер · позиционная торговля · 7 инструментов
                    </p>
                </div>
            </div>

            {/* ── Scanner (full width) ── */}
            <ScannerPanel
                selectedSymbol={symbol}
                onSelectSymbol={setSymbol}
            />

            {/* ── Chart + HTF Context ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">

                {/* Left: HTF Context */}
                <div className="order-2 lg:order-1">
                    <HtfContextPanelStandalone symbol={symbol} />
                </div>

                {/* Right: KlineChart */}
                <div className="order-1 lg:order-2 overflow-hidden rounded-2xl border border-white/8 bg-[#0E1117]/80">
                    {/* Chart toolbar */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/8">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                                Chart
                            </span>
                            <span className="text-[11px] font-mono text-white/60">
                                {symbol}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {/* Interval switcher */}
                            <div className="flex items-center gap-0.5">
                                {INTERVALS.map(tf => (
                                    <IntervalBtn
                                        key={tf}
                                        tf={tf}
                                        active={interval === tf}
                                        onClick={() => setTf(tf)}
                                    />
                                ))}
                            </div>

                            {/* Manual refresh */}
                            <button
                                type="button"
                                onClick={() => setRefresh(k => k + 1)}
                                title="Обновить"
                                aria-label="Обновить данные"
                                className="inline-flex h-7 w-7 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-white/30 transition hover:border-white/20 hover:text-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                            >
                                <RefreshCw className="h-3 w-3" strokeWidth={2} />
                            </button>

                            {/* Live badge */}
                            <span className="flex items-center gap-1 rounded border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                Live
                            </span>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="h-[520px]">
                        <KlineChart
                            key={`${symbol}-${interval}-${refreshKey}`}
                            symbol={symbol}
                            interval={interval}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
