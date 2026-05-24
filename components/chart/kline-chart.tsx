"use client";

/**
 * KlineChart — wrapper around klinecharts v10 with dark theme.
 *
 * Props:
 *   symbol   — internal symbol ("BTCUSDT", "XAUUSD", …)
 *   interval — "D" | "W" | "M" | "4H"
 *   className — optional CSS class for the container div
 *
 * Data is fetched from GET /api/candles/{symbol}?interval=…&limit=500.
 * The DataLoader pattern lets klinecharts manage paging/refresh internally.
 */

import { useEffect, useRef } from "react";
import type { Chart, DeepPartial, Styles, Period } from "klinecharts";
import { getCandles } from "@/lib/api";

// ---------------------------------------------------------------------------
// Interval ↔ KlineCharts Period mapping
// ---------------------------------------------------------------------------

type KPeriod = { type: "day" | "week" | "month" | "hour"; span: number };

const PERIOD_MAP: Record<string, KPeriod> = {
    D:   { type: "day",   span: 1 },
    W:   { type: "week",  span: 1 },
    M:   { type: "month", span: 1 },
    "4H": { type: "hour", span: 4 },
};

/** Reverse-map a klinecharts Period → our API interval string */
function periodToApiInterval(period: Period): string {
    if (period.type === "day")   return "D";
    if (period.type === "week")  return "W";
    if (period.type === "month") return "M";
    if (period.type === "hour" && period.span === 4) return "4H";
    return "D";
}

// ---------------------------------------------------------------------------
// Symbol metadata: price / volume decimal precision
// ---------------------------------------------------------------------------

const SYMBOL_META: Record<string, { pricePrecision: number; volumePrecision: number }> = {
    BTCUSDT: { pricePrecision: 2, volumePrecision: 4 },
    ETHUSDT: { pricePrecision: 2, volumePrecision: 4 },
    XAUUSD:  { pricePrecision: 2, volumePrecision: 0 },
    SPY:     { pricePrecision: 2, volumePrecision: 0 },
    QQQ:     { pricePrecision: 2, volumePrecision: 0 },
    EURUSD:  { pricePrecision: 5, volumePrecision: 0 },
    USDJPY:  { pricePrecision: 3, volumePrecision: 0 },
};

const DEFAULT_META = { pricePrecision: 2, volumePrecision: 0 };

// ---------------------------------------------------------------------------
// Dark theme styles matching the dashboard palette
// ---------------------------------------------------------------------------

const DARK_STYLES: DeepPartial<Styles> = {
    grid: {
        show: true,
        horizontal: {
            show: true,
            size: 1,
            color: "rgba(255,255,255,0.04)",
            style: "dashed",
            dashedValue: [4, 4],
        },
        vertical: {
            show: false,
        },
    },
    candle: {
        type: "candle_solid",
        bar: {
            upColor:              "#26a69a",
            downColor:            "#ef5350",
            noChangeColor:        "#888888",
            upBorderColor:        "#26a69a",
            downBorderColor:      "#ef5350",
            noChangeBorderColor:  "#888888",
            upWickColor:          "#26a69a",
            downWickColor:        "#ef5350",
            noChangeWickColor:    "#888888",
        },
        priceMark: {
            show: true,
            high: {
                show: true,
                color: "rgba(255,255,255,0.5)",
                textOffset: 5,
                textSize: 10,
                textFamily: "inherit",
                textWeight: "normal",
            },
            low: {
                show: true,
                color: "rgba(255,255,255,0.5)",
                textOffset: 5,
                textSize: 10,
                textFamily: "inherit",
                textWeight: "normal",
            },
            last: {
                show: true,
                upColor:   "#26a69a",
                downColor: "#ef5350",
                noChangeColor: "#888888",
                line: {
                    show: true,
                    style: "dashed",
                    dashedValue: [4, 4],
                    size: 1,
                },
                text: {
                    show: true,
                    size: 11,
                    paddingLeft: 4,
                    paddingTop: 2,
                    paddingRight: 4,
                    paddingBottom: 2,
                    borderRadius: 2,
                    color: "#ffffff",
                    family: "inherit",
                    weight: "normal",
                    borderSize: 1,
                    borderColor: "transparent",
                    borderStyle: "solid",
                    borderDashedValue: [2, 2],
                },
            },
        },
        tooltip: {
            showRule: "always",
            showType: "standard",
        },
    },
    indicator: {
        bars: [
            {
                style: "fill",
                borderStyle: "solid",
                borderSize: 1,
                borderDashedValue: [2, 2],
                upColor:       "rgba(38, 166, 154, 0.7)",
                downColor:     "rgba(239, 83, 80, 0.7)",
                noChangeColor: "rgba(136,136,136,0.7)",
            },
        ],
        lines: [
            { size: 1, smooth: false, color: "#FF9600", style: "solid", dashedValue: [2, 2] },
            { size: 1, smooth: false, color: "#935EBD", style: "solid", dashedValue: [2, 2] },
            { size: 1, smooth: false, color: "#E9D0BC", style: "solid", dashedValue: [2, 2] },
            { size: 1, smooth: false, color: "#22C5FF", style: "solid", dashedValue: [2, 2] },
            { size: 1, smooth: false, color: "#00C1C1", style: "solid", dashedValue: [2, 2] },
        ],
        tooltip: {
            showRule: "always",
            showType: "standard",
            title: { showName: true, showParams: true },
        },
    },
    xAxis: {
        show: true,
        axisLine: { show: true, color: "rgba(255,255,255,0.08)", size: 1 },
        tickLine: { show: true, size: 1, length: 3, color: "rgba(255,255,255,0.08)" },
        tickText: {
            show: true,
            color: "rgba(255,255,255,0.35)",
            size: 11,
            family: "inherit",
            weight: "normal",
            marginStart: 4,
            marginEnd: 4,
        },
    },
    yAxis: {
        show: true,
        axisLine: { show: false, color: "rgba(255,255,255,0.08)", size: 1 },
        tickLine: { show: false, size: 1, length: 3, color: "rgba(255,255,255,0.08)" },
        tickText: {
            show: true,
            color: "rgba(255,255,255,0.35)",
            size: 11,
            family: "inherit",
            weight: "normal",
            marginStart: 4,
            marginEnd: 4,
        },
    },
    crosshair: {
        show: true,
        horizontal: {
            show: true,
            line: {
                show: true,
                style: "dashed",
                dashedValue: [4, 4],
                size: 1,
                color: "rgba(255,255,255,0.25)",
            },
            text: {
                show: true,
                size: 11,
                family: "inherit",
                weight: "normal",
                color: "#ffffff",
                backgroundColor: "rgba(15,18,30,0.92)",
                borderRadius: 3,
                borderSize: 1,
                borderColor: "rgba(255,255,255,0.15)",
                paddingLeft: 6,
                paddingRight: 6,
                paddingTop: 3,
                paddingBottom: 3,
            },
        },
        vertical: {
            show: true,
            line: {
                show: true,
                style: "dashed",
                dashedValue: [4, 4],
                size: 1,
                color: "rgba(255,255,255,0.25)",
            },
            text: {
                show: true,
                size: 11,
                family: "inherit",
                weight: "normal",
                color: "#ffffff",
                backgroundColor: "rgba(15,18,30,0.92)",
                borderRadius: 3,
                borderSize: 1,
                borderColor: "rgba(255,255,255,0.15)",
                paddingLeft: 6,
                paddingRight: 6,
                paddingTop: 3,
                paddingBottom: 3,
            },
        },
    },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface KlineChartProps {
    symbol?: string;
    interval?: string;
    className?: string;
}

export function KlineChart({
    symbol   = "BTCUSDT",
    interval = "D",
    className,
}: KlineChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef     = useRef<Chart | null>(null);
    // Keep latest symbol/interval accessible from the DataLoader closure
    const symbolRef   = useRef(symbol);
    const intervalRef = useRef(interval);

    useEffect(() => { symbolRef.current   = symbol;   }, [symbol]);
    useEffect(() => { intervalRef.current = interval; }, [interval]);

    // ── Init chart once ────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;

        void (async () => {
            const { init, dispose } = await import("klinecharts");
            if (!mounted || !containerRef.current) return;

            const chart = init(containerRef.current, {
                styles: DARK_STYLES,
                layout: {
                    panes: [
                        {
                            type: "candle",
                            content: [
                                { indicator: "MA", yAxis: {} },
                            ],
                            options: { dragEnabled: false },
                        },
                        {
                            type: "indicator",
                            content: ["VOL"],
                            options: { height: 80, dragEnabled: false },
                        },
                        { type: "xAxis" },
                    ],
                },
            });

            if (!chart) return;
            chartRef.current = chart;

            // ── DataLoader: fetches candles from our backend ──────────────
            chart.setDataLoader({
                getBars: async ({ period, symbol: sym, callback }) => {
                    const apiInterval = periodToApiInterval(period as Period);
                    try {
                        const resp = await getCandles(sym.ticker, apiInterval, 500);
                        const bars = resp.candles.map((c) => ({
                            timestamp: c.t,
                            open:      c.o,
                            high:      c.h,
                            low:       c.l,
                            close:     c.c,
                            volume:    c.v,
                        }));
                        // `more = false` → no older data to load (we sent the full history)
                        callback(bars, false);
                    } catch (err) {
                        console.error("[KlineChart] getBars error:", err);
                        callback([], false);
                    }
                },
            });

            // ── Initial symbol + period (triggers the first getBars call) ─
            const meta = SYMBOL_META[symbolRef.current] ?? DEFAULT_META;
            chart.setSymbol({
                ticker:          symbolRef.current,
                pricePrecision:  meta.pricePrecision,
                volumePrecision: meta.volumePrecision,
            });
            chart.setPeriod(PERIOD_MAP[intervalRef.current] ?? PERIOD_MAP.D);

            // Cleanup function returned from inner async IIFE is ignored by
            // useEffect (the outer cleanup below handles it).
            // Store dispose fn so cleanup works even if the outer import
            // hasn't been re-awaited.
            (chart as Chart & { _dispose?: () => void })._dispose = () =>
                dispose(chart);
        })();

        return () => {
            mounted = false;
            if (chartRef.current) {
                const c = chartRef.current as Chart & { _dispose?: () => void };
                c._dispose?.();
                chartRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Update symbol/period when props change (chart already exists) ──────
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;           // chart not ready yet — init will read symbolRef

        const meta = SYMBOL_META[symbol] ?? DEFAULT_META;
        chart.setSymbol({
            ticker:          symbol,
            pricePrecision:  meta.pricePrecision,
            volumePrecision: meta.volumePrecision,
        });
        chart.setPeriod(PERIOD_MAP[interval] ?? PERIOD_MAP.D);
    }, [symbol, interval]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{ width: "100%", height: "100%", background: "#0A0C12" }}
        />
    );
}
