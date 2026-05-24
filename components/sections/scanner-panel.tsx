"use client";

import { useEffect } from "react";
import { useApi } from "@/hooks/use-api";
import { getScanner, type ScannerRow } from "@/lib/api";

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function signalLabel(s: ScannerRow["trend_entry_signal"]): string {
    switch (s) {
        case "ready":   return "READY";
        case "wait":    return "WAIT";
        case "caution": return "CAUTION";
        default:        return "—";
    }
}

function signalColor(s: ScannerRow["trend_entry_signal"]): string {
    switch (s) {
        case "ready":   return "#34d399";
        case "wait":    return "#fbbf24";
        case "caution": return "#fb923c";
        default:        return "#6b7280";
    }
}

function regimeLabel(r: ScannerRow["trend_regime"]): string {
    switch (r) {
        case "strong_uptrend": return "↑↑ STRONG UP";
        case "weak_uptrend":   return "↑ UPTREND";
        case "neutral":        return "→ NEUTRAL";
        case "downtrend":      return "↓ DOWN";
        case "overheated":     return "🔥 HOT";
        default:               return "—";
    }
}

function regimeColor(r: ScannerRow["trend_regime"]): string {
    switch (r) {
        case "strong_uptrend": return "#34d399";
        case "weak_uptrend":   return "#86efac";
        case "neutral":        return "#94a3b8";
        case "downtrend":      return "#f87171";
        case "overheated":     return "#fb923c";
        default:               return "#6b7280";
    }
}

function biasColor(b: ScannerRow["macro_bias"]): string {
    switch (b) {
        case "bullish":    return "#34d399";
        case "bearish":    return "#f87171";
        case "transition": return "#fbbf24";
        case "range":      return "#a78bfa";
        default:           return "#6b7280";
    }
}

function assetBadge(cls: string): string {
    switch (cls) {
        case "crypto":    return "bg-violet-400/10 text-violet-300 border-violet-400/20";
        case "commodity": return "bg-amber-400/10  text-amber-300  border-amber-400/20";
        case "index":     return "bg-blue-400/10   text-blue-300   border-blue-400/20";
        case "forex":     return "bg-slate-400/10  text-slate-300  border-slate-400/20";
        default:          return "bg-white/5        text-white/40   border-white/10";
    }
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function ScannerRowItem({
    row,
    active,
    onClick,
}: {
    row: ScannerRow;
    active: boolean;
    onClick: () => void;
}) {
    if (row.status !== "ok") {
        const isLoading = row.status === "loading" || row.status === "cache_miss";
        return (
            <tr className="border-b border-white/5">
                <td className="px-3 py-2 font-mono text-[11px] text-white/50">{row.symbol}</td>
                <td colSpan={7} className={`px-3 py-2 text-[11px] ${isLoading ? "text-white/30 animate-pulse" : "text-red-400/70"}`}>
                    {isLoading ? "загрузка данных…" : "ошибка данных"}
                </td>
            </tr>
        );
    }

    return (
        <tr
            onClick={onClick}
            className={`border-b border-white/5 cursor-pointer transition-colors ${
                active
                    ? "bg-cyan-400/[0.06] border-l-2 border-l-cyan-400/50"
                    : "hover:bg-white/[0.025]"
            }`}
        >
            {/* Symbol */}
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border uppercase tracking-wide ${assetBadge(row.asset_class)}`}>
                        {row.asset_class === "commodity" ? "CMD" : row.asset_class.slice(0, 3).toUpperCase()}
                    </span>
                    <span className="font-mono text-[12px] font-semibold text-white/90">
                        {row.symbol}
                    </span>
                </div>
            </td>

            {/* Signal */}
            <td className="px-3 py-2.5">
                <span
                    className="text-[11px] font-bold tracking-wider"
                    style={{ color: signalColor(row.trend_entry_signal) }}
                >
                    {signalLabel(row.trend_entry_signal)}
                </span>
            </td>

            {/* Regime */}
            <td className="px-3 py-2.5">
                <span
                    className="text-[10px] font-medium"
                    style={{ color: regimeColor(row.trend_regime) }}
                >
                    {regimeLabel(row.trend_regime)}
                </span>
            </td>

            {/* Macro */}
            <td className="px-3 py-2.5">
                <span
                    className="text-[10px] font-medium uppercase"
                    style={{ color: biasColor(row.macro_bias) }}
                >
                    {row.macro_bias ?? "—"}
                </span>
            </td>

            {/* ADX */}
            <td className="px-3 py-2.5 font-mono text-[11px] text-white/65">
                {row.weekly_adx !== null ? row.weekly_adx.toFixed(1) : "—"}
            </td>

            {/* RSI */}
            <td className="px-3 py-2.5 font-mono text-[11px]">
                <span
                    style={{
                        color: row.rsi_14 === null ? "#6b7280"
                            : row.rsi_14 > 70 ? "#fb923c"
                            : row.rsi_14 < 30 ? "#34d399"
                            : "#94a3b8",
                    }}
                >
                    {row.rsi_14 !== null ? row.rsi_14.toFixed(1) : "—"}
                </span>
            </td>

            {/* Momentum 12w */}
            <td className="px-3 py-2.5 text-center text-[12px]">
                {row.momentum_12w_positive === null ? (
                    <span className="text-white/25">—</span>
                ) : row.momentum_12w_positive ? (
                    <span className="text-emerald-400">✓</span>
                ) : (
                    <span className="text-red-400">✗</span>
                )}
            </td>

            {/* Weinstein (above SMA 30w) */}
            <td className="px-3 py-2.5 text-center text-[12px]">
                {row.above_sma_30w === null ? (
                    <span className="text-white/25">—</span>
                ) : row.above_sma_30w ? (
                    <span className="text-emerald-400">✓</span>
                ) : (
                    <span className="text-red-400">✗</span>
                )}
            </td>

            {/* Minervini */}
            <td className="px-3 py-2.5 text-center text-[12px]">
                {row.minervini_ok === null ? (
                    <span className="text-white/25">—</span>
                ) : row.minervini_ok ? (
                    <span className="text-emerald-400">✓</span>
                ) : (
                    <span className="text-red-400">✗</span>
                )}
            </td>
        </tr>
    );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export interface ScannerPanelProps {
    selectedSymbol: string;
    onSelectSymbol: (sym: string) => void;
}

export function ScannerPanel({ selectedSymbol, onSelectSymbol }: ScannerPanelProps) {
    const { data, loading, error, refreshing, refresh } = useApi(
        getScanner,
        [],
        { intervalMs: 60 * 60 * 1000 }, // auto-refresh 1h (data TTL on server is 6h)
    );

    // Auto-poll every 30s while any symbol is still loading (background warm-up in progress)
    const hasLoading = data?.rows.some(r => r.status === "loading" || r.status === "cache_miss");
    useEffect(() => {
        if (!hasLoading) return;
        const timer = setTimeout(() => { refresh(); }, 30_000);
        return () => clearTimeout(timer);
    }, [hasLoading, refresh]);

    return (
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0E1117]/80">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                        Scanner
                    </span>
                    {data && (
                        <span className="text-[10px] text-white/25">
                            {data.symbols_count} инструментов
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {refreshing && (
                        <span className="text-[10px] text-white/30 animate-pulse">обновление…</span>
                    )}
                    <button
                        type="button"
                        onClick={refresh}
                        className="text-[10px] text-white/25 hover:text-white/60 transition-colors"
                        title="Обновить"
                    >
                        ↻
                    </button>
                    {data && (
                        <span className="text-[10px] text-white/20">
                            {new Date(data.updated_at).toLocaleTimeString("ru-RU", {
                                hour: "2-digit", minute: "2-digit",
                            })}
                        </span>
                    )}
                </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="p-4 space-y-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="h-9 rounded bg-white/5 animate-pulse" />
                    ))}
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="px-4 py-6 text-center text-[12px] text-red-400/70">
                    Не удалось загрузить данные сканера
                </div>
            )}

            {/* Table */}
            {data && !loading && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/6">
                                {["Символ", "Сигнал", "Режим", "Macro", "ADX", "RSI", "Mom12w", "Wein", "Min"].map(h => (
                                    <th
                                        key={h}
                                        className="px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/25"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map(row => (
                                <ScannerRowItem
                                    key={row.symbol}
                                    row={row}
                                    active={row.symbol === selectedSymbol}
                                    onClick={() => onSelectSymbol(row.symbol)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
