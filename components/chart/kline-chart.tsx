"use client";

/**
 * KlineChart — wrapper around klinecharts v10 with dark theme.
 *
 * Props:
 *   symbol       — internal symbol ("BTCUSDT", "XAUUSD", …)
 *   interval     — "1H" | "4H" | "D" | "W" | "M"
 *   className    — optional CSS class for the outer wrapper div
 *   showToolbar  — show drawing toolbar + indicator toggle buttons
 *   syncOverlays — persist user drawings per symbol/interval to backend
 *
 * Data is fetched from GET /api/candles/{symbol}?interval=…&limit=500.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Chart, DeepPartial, Styles, Period } from "klinecharts";
import { getCandles } from "@/lib/api";
import { MousePointer2, Trash2, Undo2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Interval ↔ KlineCharts Period mapping
// ---------------------------------------------------------------------------

type KPeriod = { type: "day" | "week" | "month" | "hour" | "minute"; span: number };

const PERIOD_MAP: Record<string, KPeriod> = {
    "1H": { type: "hour",  span: 1 },
    "4H": { type: "hour",  span: 4 },
    D:    { type: "day",   span: 1 },
    W:    { type: "week",  span: 1 },
    M:    { type: "month", span: 1 },
};

function periodToApiInterval(period: Period): string {
    if (period.type === "hour"  && period.span === 1) return "1H";
    if (period.type === "hour"  && period.span === 4) return "4H";
    if (period.type === "day")   return "D";
    if (period.type === "week")  return "W";
    if (period.type === "month") return "M";
    return "D";
}

// ---------------------------------------------------------------------------
// Symbol metadata
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
// Fibonacci overlay with colored zones
// ---------------------------------------------------------------------------

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0] as const;

const FIB_ZONE_COLORS = [
    "rgba(128,128,128,0.06)",
    "rgba(0,188,212,0.12)",
    "rgba(255,235,59,0.10)",
    "rgba(255,193,7,0.14)",
    "rgba(255,152,0,0.16)",
    "rgba(244,67,54,0.18)",
] as const;

const FIB_LINE_COLORS = [
    "rgba(160,160,160,0.55)",
    "rgba(0,188,212,0.70)",
    "rgba(255,235,59,0.70)",
    "rgba(255,193,7,0.80)",
    "rgba(255,152,0,0.80)",
    "rgba(244,67,54,0.80)",
    "rgba(255,255,255,0.50)",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fibZonesTemplate: any = {
    name: "fibZones",
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createPointFigures: ({ coordinates, bounding }: any) => {
        // bounding has { width, height, left, right, top, bottom } — no x/y
        const W = bounding.width as number;

        // Step 1: show anchor line so user sees tool is active
        if (coordinates.length < 2) {
            if (coordinates.length === 0) return [];
            return [{
                type: "line",
                attrs: { coordinates: [{ x: 0, y: coordinates[0].y }, { x: W, y: coordinates[0].y }] },
                styles: { color: "rgba(255,255,255,0.20)", size: 1, style: "dashed", dashedValue: [4, 4] },
                ignoreEvent: true,
            }];
        }

        const figures: object[] = [];
        const y0 = coordinates[0].y as number;
        const y1 = coordinates[1].y as number;
        const ys = (FIB_LEVELS as readonly number[]).map(l => y0 + (y1 - y0) * l);

        for (let i = 0; i < ys.length - 1; i++) {
            const yTop = Math.min(ys[i], ys[i + 1]);
            const yBot = Math.max(ys[i], ys[i + 1]);
            figures.push({
                type: "rect",
                attrs: { x: 0, y: yTop, width: W, height: yBot - yTop },
                styles: { color: FIB_ZONE_COLORS[i], borderSize: 0, borderColor: "transparent" },
                ignoreEvent: true,
            });
        }
        for (let i = 0; i < ys.length; i++) {
            figures.push({
                type: "line",
                attrs: { coordinates: [{ x: 0, y: ys[i] }, { x: W, y: ys[i] }] },
                styles: { color: FIB_LINE_COLORS[i], size: 1, style: "solid" },
                ignoreEvent: true,
            });
            figures.push({
                type: "text",
                attrs: { x: 4, y: ys[i] - 3, text: `${(FIB_LEVELS[i] * 100).toFixed(1)}%` },
                styles: { color: FIB_LINE_COLORS[i], size: 10, family: "inherit", weight: "normal" },
                ignoreEvent: true,
            });
        }
        return figures;
    },
};

// ---------------------------------------------------------------------------
// Drawing tools
// ---------------------------------------------------------------------------

const DRAW_TOOLS: { id: string | null; label: string; title: string }[] = [
    { id: null,                       label: "↖",   title: "Курсор" },
    { id: "straightLine",             label: "╱",   title: "Линия тренда" },
    { id: "horizontalStraightLine",   label: "—",   title: "Горизонтальная" },
    { id: "rayLine",                  label: "→",   title: "Луч" },
    { id: "segment",                  label: "╌",   title: "Отрезок" },
    { id: "fibZones",                 label: "Fib", title: "Fibonacci" },
];

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------

type IndicatorDef = { key: string; name: string; label: string; calcParams?: number[]; paneId?: string };

const INDICATORS: IndicatorDef[] = [
    { key: "MA",   name: "MA",   label: "MA",   paneId: "candle_pane" },
    { key: "EMA",  name: "EMA",  label: "EMA",  calcParams: [20, 50, 200], paneId: "candle_pane" },
    { key: "BOLL", name: "BOLL", label: "BB",   paneId: "candle_pane" },
    { key: "MACD", name: "MACD", label: "MACD" },
];

// ---------------------------------------------------------------------------
// Dark theme styles
// ---------------------------------------------------------------------------

const DARK_STYLES: DeepPartial<Styles> = {
    grid: {
        show: true,
        horizontal: { show: true, size: 1, color: "rgba(255,255,255,0.04)", style: "dashed", dashedValue: [4, 4] },
        vertical:   { show: false },
    },
    candle: {
        type: "candle_solid",
        bar: {
            upColor:             "#26a69a", downColor:             "#ef5350", noChangeColor:             "#888888",
            upBorderColor:       "#26a69a", downBorderColor:       "#ef5350", noChangeBorderColor:       "#888888",
            upWickColor:         "#26a69a", downWickColor:         "#ef5350", noChangeWickColor:         "#888888",
        },
        priceMark: {
            show: true,
            high: { show: true, color: "rgba(255,255,255,0.5)", textOffset: 5, textSize: 10, textFamily: "inherit", textWeight: "normal" },
            low:  { show: true, color: "rgba(255,255,255,0.5)", textOffset: 5, textSize: 10, textFamily: "inherit", textWeight: "normal" },
            last: {
                show: true, upColor: "#26a69a", downColor: "#ef5350", noChangeColor: "#888888",
                line: { show: true, style: "dashed", dashedValue: [4, 4], size: 1 },
                text: {
                    show: true, size: 11, paddingLeft: 4, paddingTop: 2, paddingRight: 4, paddingBottom: 2,
                    borderRadius: 2, color: "#ffffff", family: "inherit", weight: "normal",
                    borderSize: 1, borderColor: "transparent", borderStyle: "solid", borderDashedValue: [2, 2],
                },
            },
        },
        tooltip: { showRule: "always", showType: "standard" },
    },
    indicator: {
        bars: [{ style: "fill", borderStyle: "solid", borderSize: 1, borderDashedValue: [2, 2], upColor: "rgba(38,166,154,0.7)", downColor: "rgba(239,83,80,0.7)", noChangeColor: "rgba(136,136,136,0.7)" }],
        lines: [
            { size: 1, smooth: false, color: "#FF9600", style: "solid", dashedValue: [2, 2] },
            { size: 1, smooth: false, color: "#935EBD", style: "solid", dashedValue: [2, 2] },
            { size: 1, smooth: false, color: "#E9D0BC", style: "solid", dashedValue: [2, 2] },
            { size: 1, smooth: false, color: "#22C5FF", style: "solid", dashedValue: [2, 2] },
            { size: 1, smooth: false, color: "#00C1C1", style: "solid", dashedValue: [2, 2] },
        ],
        tooltip: { showRule: "always", showType: "standard", title: { showName: true, showParams: true } },
    },
    xAxis: {
        show: true,
        axisLine:  { show: true,  color: "rgba(255,255,255,0.08)", size: 1 },
        tickLine:  { show: true,  size: 1, length: 3, color: "rgba(255,255,255,0.08)" },
        tickText:  { show: true,  color: "rgba(255,255,255,0.35)", size: 11, family: "inherit", weight: "normal", marginStart: 4, marginEnd: 4 },
    },
    yAxis: {
        show: true,
        axisLine:  { show: false, color: "rgba(255,255,255,0.08)", size: 1 },
        tickLine:  { show: false, size: 1, length: 3, color: "rgba(255,255,255,0.08)" },
        tickText:  { show: true,  color: "rgba(255,255,255,0.35)", size: 11, family: "inherit", weight: "normal", marginStart: 4, marginEnd: 4 },
    },
    crosshair: {
        show: true,
        horizontal: {
            show: true,
            line: { show: true, style: "dashed", dashedValue: [4, 4], size: 1, color: "rgba(255,255,255,0.25)" },
            text: { show: true, size: 11, family: "inherit", weight: "normal", color: "#ffffff", backgroundColor: "rgba(15,18,30,0.92)", borderRadius: 3, borderSize: 1, borderColor: "rgba(255,255,255,0.15)", paddingLeft: 6, paddingRight: 6, paddingTop: 3, paddingBottom: 3 },
        },
        vertical: {
            show: true,
            line: { show: true, style: "dashed", dashedValue: [4, 4], size: 1, color: "rgba(255,255,255,0.25)" },
            text: { show: true, size: 11, family: "inherit", weight: "normal", color: "#ffffff", backgroundColor: "rgba(15,18,30,0.92)", borderRadius: 3, borderSize: 1, borderColor: "rgba(255,255,255,0.15)", paddingLeft: 6, paddingRight: 6, paddingTop: 3, paddingBottom: 3 },
        },
    },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface KlineChartProps {
    symbol?:       string;
    interval?:     string;
    className?:    string;
    showToolbar?:  boolean;
    syncOverlays?: boolean;
}

export function KlineChart({
    symbol       = "BTCUSDT",
    interval     = "D",
    className,
    showToolbar  = false,
    syncOverlays = false,
}: KlineChartProps) {
    const containerRef      = useRef<HTMLDivElement>(null);
    const chartRef          = useRef<Chart | null>(null);
    const symbolRef         = useRef(symbol);
    const intervalRef       = useRef(interval);
    const syncRef           = useRef(syncOverlays);
    const loadingRef        = useRef(false);
    const saveTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const indicatorIds      = useRef<Map<string, string>>(new Map());
    const activeDrawToolRef    = useRef<string | null>(null);   // mirrors state for closures
    const pendingOverlayIdRef  = useRef<string | null>(null);   // in-progress draw overlay
    const dataReadyRef         = useRef<(() => void) | null>(null);
    const isDataLoadedRef      = useRef(false);

    const [activeDrawTool,   setActiveDrawTool]   = useState<string | null>(null);
    const [activeIndicators, setActiveIndicators] = useState<Set<string>>(() => {
        if (typeof window === "undefined") return new Set(["MA"]);
        try {
            const ls = localStorage.getItem(`kc_ind_${symbol}`);
            if (ls) return new Set(JSON.parse(ls) as string[]);
        } catch {}
        return new Set(["MA"]);
    });

    useEffect(() => { symbolRef.current   = symbol;       }, [symbol]);
    useEffect(() => { intervalRef.current = interval;     }, [interval]);
    useEffect(() => { syncRef.current     = syncOverlays; }, [syncOverlays]);

    // ── Save overlays (debounced 1 s) ──────────────────────────────────────
    const buildPayload = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return null;
        const overlays = chart.getOverlays();
        return overlays.map(({ name, id, groupId, lock, visible, zLevel, mode, points, styles, extendData }) => ({
            name, id, groupId, lock, visible, zLevel, mode, points, styles, extendData,
        }));
    }, []);

    const lsKey = useCallback((sym: string, intv: string) => `kc_ov_${sym}_${intv}`, []);

    const doSave = useCallback((payload: ReturnType<typeof buildPayload>) => {
        if (!payload) return;
        // Write to localStorage immediately — no race condition on next read
        try { localStorage.setItem(lsKey(symbolRef.current, intervalRef.current), JSON.stringify(payload)); } catch {}
        // Async backend sync (cross-device, fire-and-forget)
        fetch("/api/chart/overlays", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: symbolRef.current, interval: intervalRef.current, overlays: payload }),
            keepalive: true,
        }).catch(() => {});
    }, [buildPayload, lsKey]);

    const scheduleSave = useCallback(() => {
        if (!syncRef.current || loadingRef.current) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => { doSave(buildPayload()); }, 800);
    }, [buildPayload, doSave]);

    // Immediate save on unmount — flushes any unsaved pending drawings
    const flushSave = useCallback(() => {
        if (!syncRef.current || loadingRef.current) return;
        if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
        doSave(buildPayload());
    }, [buildPayload, doSave]);

    // ── Load overlays: localStorage first (instant), backend as fallback ───
    const loadOverlays = useCallback(async (chart: Chart, sym: string, intv: string) => {
        if (!syncRef.current) return;
        // Wait until getBars("init") has supplied data to the chart
        if (!isDataLoadedRef.current) {
            await new Promise<void>(resolve => { dataReadyRef.current = resolve; });
        }
        loadingRef.current = true;
        try {
            // 1. Read from localStorage (synchronous — always up-to-date, no race)
            let overlays: Record<string, unknown>[] = [];
            try {
                const ls = localStorage.getItem(lsKey(sym, intv));
                if (ls) overlays = JSON.parse(ls) || [];
            } catch {}
            // 2. Fallback to backend if localStorage has nothing (first device, cleared storage)
            if (!overlays.length) {
                const res = await fetch(`/api/chart/overlays?symbol=${sym}&interval=${intv}`);
                if (res.ok) {
                    const data = await res.json() as { overlays: Record<string, unknown>[] };
                    overlays = data.overlays || [];
                    // Seed localStorage so next load is instant
                    if (overlays.length) {
                        try { localStorage.setItem(lsKey(sym, intv), JSON.stringify(overlays)); } catch {}
                    }
                }
            }
            for (const o of overlays) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                chart.createOverlay({ ...(o as any), onRemoved: scheduleSave } as any);
            }
        } catch { /* ignore */ } finally {
            loadingRef.current = false;
        }
    }, [scheduleSave, lsKey]);

    // ── Init chart once ────────────────────────────────────────────────────
    useEffect(() => {
        let mounted = true;

        void (async () => {
            const { init, dispose, registerOverlay } = await import("klinecharts");
            if (!mounted || !containerRef.current) return;

            registerOverlay(fibZonesTemplate);

            const chart = init(containerRef.current, {
                styles: DARK_STYLES,
                layout: {
                    panes: [
                        { type: "candle",    content: [], options: { dragEnabled: false } },
                        { type: "indicator", content: ["VOL"], options: { height: 80, dragEnabled: false } },
                        { type: "xAxis" },
                    ],
                },
            });
            if (!chart) return;
            chartRef.current = chart;

            // Sync resize so _totalBarSpace is calculated before data loads
            chart.resize();

            chart.setDataLoader({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                getBars: async ({ type, period, symbol: sym, callback }: any) => {
                    const apiInterval = periodToApiInterval(period as Period);
                    try {
                        const resp = await getCandles(sym.ticker, apiInterval, 500);
                        callback(resp.candles.map((c: any) => ({ timestamp: c.t, open: c.o, high: c.h, low: c.l, close: c.c, volume: c.v })), false);
                    } catch {
                        callback([], false);
                    }
                    if (type === "init") {
                        isDataLoadedRef.current = true;
                        const cb = dataReadyRef.current;
                        dataReadyRef.current = null;
                        cb?.();
                    }
                },
            });

            const meta = SYMBOL_META[symbolRef.current] ?? DEFAULT_META;
            chart.setSymbol({ ticker: symbolRef.current, pricePrecision: meta.pricePrecision, volumePrecision: meta.volumePrecision });
            chart.setPeriod(PERIOD_MAP[intervalRef.current] ?? PERIOD_MAP.D);

            // Create only indicators that were active last time (persisted in localStorage)
            const savedInds: string[] = (() => {
                try {
                    const ls = localStorage.getItem(`kc_ind_${symbolRef.current}`);
                    if (ls) return JSON.parse(ls) as string[];
                } catch {}
                return ["MA"];  // default on first visit
            })();
            for (const key of savedInds) {
                const def = INDICATORS.find(i => i.key === key);
                if (!def) continue;
                const indicatorCreate = def.calcParams ? { name: def.name, calcParams: def.calcParams } : def.name;
                const indicatorOptions = def.paneId ? { isStack: true, pane: { id: def.paneId } } : undefined;
                const id = chart.createIndicator(indicatorCreate, indicatorOptions) as string | null;
                if (id) indicatorIds.current.set(key, id);
            }

            await loadOverlays(chart, symbolRef.current, intervalRef.current);

            // Ensure chart recalculates after layout settles
            requestAnimationFrame(() => {
                if (mounted) chart.resize();
            });

            (chart as Chart & { _dispose?: () => void })._dispose = () => dispose(chart);
        })();

        return () => {
            mounted = false;
            flushSave();   // persist drawings before chart is destroyed
            if (chartRef.current) {
                (chartRef.current as Chart & { _dispose?: () => void })._dispose?.();
                chartRef.current = null;
            }
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            dataReadyRef.current = null;
            isDataLoadedRef.current = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Update symbol/period; reload overlays ──────────────────────────────
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        isDataLoadedRef.current = false;   // mark stale before new getBars fires
        const meta = SYMBOL_META[symbol] ?? DEFAULT_META;
        chart.setSymbol({ ticker: symbol, pricePrecision: meta.pricePrecision, volumePrecision: meta.volumePrecision });
        chart.setPeriod(PERIOD_MAP[interval] ?? PERIOD_MAP.D);

        if (syncRef.current) {
            loadingRef.current = true;
            chart.removeOverlay();
            void loadOverlays(chart, symbol, interval);
        }
    }, [symbol, interval, loadOverlays]);

    // ── Drawing tool selection (continuous mode — stays active after each draw)
    const selectDrawTool = useCallback((toolId: string | null) => {
        // Cancel any in-progress drawing before switching tools
        const prevId = pendingOverlayIdRef.current;
        pendingOverlayIdRef.current = null;
        if (prevId && chartRef.current) {
            try { (chartRef.current as any).removeOverlay({ id: prevId }); } catch {}
        }

        setActiveDrawTool(toolId);
        activeDrawToolRef.current = toolId;
        if (!chartRef.current || !toolId) return;

        const arm = (name: string) => {
            if (!chartRef.current) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const id = (chartRef.current as any).createOverlay({
                name,
                onDrawEnd: () => {
                    pendingOverlayIdRef.current = null;
                    scheduleSave();
                    // Re-arm same tool so the next shape can be drawn immediately
                    if (activeDrawToolRef.current === name) arm(name);
                },
                onRemoved: scheduleSave,
            }) as string | null;
            pendingOverlayIdRef.current = id;
        };

        arm(toolId);
    }, [scheduleSave]);

    // ── Indicator toggle ───────────────────────────────────────────────────
    const toggleIndicator = useCallback((key: string) => {
        const chart = chartRef.current;
        if (!chart) return;
        const def = INDICATORS.find(i => i.key === key);
        if (!def) return;

        setActiveIndicators(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                chart.removeIndicator({ name: def.name });
                indicatorIds.current.delete(key);
                next.delete(key);
            } else {
                const indicatorCreate = def.calcParams
                    ? { name: def.name, calcParams: def.calcParams }
                    : def.name;
                const indicatorOptions = def.paneId
                    ? { isStack: true, pane: { id: def.paneId } }
                    : undefined;
                const result = chart.createIndicator(indicatorCreate, indicatorOptions) as string | null;
                if (result) indicatorIds.current.set(key, result);
                next.add(key);
            }
            // Persist so state survives SPA navigation
            try { localStorage.setItem(`kc_ind_${symbolRef.current}`, JSON.stringify([...next])); } catch {}
            return next;
        });
    }, []);

    // ── Remove last overlay ────────────────────────────────────────────────
    const removeLastOverlay = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const overlays = chart.getOverlays();
        if (overlays.length > 0) {
            chart.removeOverlay({ id: overlays[overlays.length - 1].id });
            scheduleSave();
        }
    }, [scheduleSave]);

    // ── Clear all overlays ─────────────────────────────────────────────────
    const clearAllOverlays = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        chart.removeOverlay();
        scheduleSave();
    }, [scheduleSave]);

    return (
        <div
            className={className}
            style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", minHeight: 0 }}
        >
            {showToolbar && (
                <div
                    style={{ flexShrink: 0, height: 38 }}
                    className="flex items-center justify-between gap-2 border-b border-white/[0.07] bg-[#080a10] px-2"
                >
                    {/* Drawing tools */}
                    <div className="flex items-center gap-0.5">
                        {DRAW_TOOLS.map(tool => {
                            const active = activeDrawTool === tool.id;
                            return (
                                <button
                                    key={tool.id ?? "__cursor"}
                                    type="button"
                                    title={tool.title}
                                    onClick={() => selectDrawTool(tool.id)}
                                    className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-[11px] transition-all duration-100
                                        ${active
                                            ? "bg-cyan-400/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]"
                                            : "text-white/38 hover:bg-white/[0.07] hover:text-white/72"
                                        }`}
                                >
                                    {tool.id === null
                                        ? <MousePointer2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                        : <span className="font-mono leading-none">{tool.label}</span>
                                    }
                                </button>
                            );
                        })}
                        <div className="mx-1.5 h-[18px] w-px bg-white/[0.09]" />
                        <button
                            type="button"
                            title="Удалить последний"
                            onClick={removeLastOverlay}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white/28 transition-all duration-100 hover:bg-white/[0.07] hover:text-white/62"
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            title="Очистить всё"
                            onClick={clearAllOverlays}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white/28 transition-all duration-100 hover:bg-red-500/[0.12] hover:text-red-400/80"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Indicator toggles */}
                    <div className="flex items-center gap-1">
                        {INDICATORS.map(ind => (
                            <button
                                key={ind.key}
                                type="button"
                                onClick={() => toggleIndicator(ind.key)}
                                className={`flex h-7 items-center justify-center rounded-md px-2.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-100
                                    ${activeIndicators.has(ind.key)
                                        ? "bg-cyan-400/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]"
                                        : "text-white/32 hover:bg-white/[0.07] hover:text-white/68"
                                    }`}
                            >
                                {ind.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    minHeight: 0,
                    width: "100%",
                    background: "#0A0C12",
                }}
            />
        </div>
    );
}
