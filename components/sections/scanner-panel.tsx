"use client";

import { useEffect, useState } from "react";
import { useApi } from "@/hooks/use-api";
import { getScanner, type ScannerRow } from "@/lib/api";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Human-readable names for ticker symbols shown in the scanner table. */
const SYMBOL_LABELS: Record<string, string> = {
    BTCUSDT:  "Bitcoin",
    ETHUSDT:  "Ethereum",
    XAUUSD:   "Gold",
    SPY:      "S&P 500",
    QQQ:      "NASDAQ-100",
    EURUSD:   "EUR/USD",
    USDJPY:   "USD/JPY",
};

function symbolLabel(symbol: string): string {
    return SYMBOL_LABELS[symbol] ?? symbol;
}

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
                <td className="px-3 py-2 font-mono text-[11px] text-white/50">{symbolLabel(row.symbol)}</td>
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
                        {symbolLabel(row.symbol)}
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
            <td className="px-3 py-2.5 text-center text-[13px] font-bold leading-none">
                {row.momentum_12w_positive === null ? (
                    <span className="text-white/25 text-[11px] font-normal">—</span>
                ) : row.momentum_12w_positive ? (
                    <span className="text-emerald-400">↑</span>
                ) : (
                    <span className="text-red-400">↓</span>
                )}
            </td>

            {/* Weinstein (above SMA 30w) */}
            <td className="px-3 py-2.5 text-center text-[13px] font-bold leading-none">
                {row.above_sma_30w === null ? (
                    <span className="text-white/25 text-[11px] font-normal">—</span>
                ) : row.above_sma_30w ? (
                    <span className="text-emerald-400">↑</span>
                ) : (
                    <span className="text-red-400">↓</span>
                )}
            </td>

            {/* Minervini */}
            <td className="px-3 py-2.5 text-center text-[13px] font-bold leading-none">
                {row.minervini_ok === null ? (
                    <span className="text-white/25 text-[11px] font-normal">—</span>
                ) : row.minervini_ok ? (
                    <span className="text-emerald-400">↑</span>
                ) : (
                    <span className="text-red-400">↓</span>
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
    const [infoOpen, setInfoOpen] = useState(false);

    // Auto-poll every 30s while any symbol is still loading (background warm-up in progress)
    const hasLoading = data?.rows.some(r => r.status === "loading" || r.status === "cache_miss");
    useEffect(() => {
        if (!hasLoading) return;
        const timer = setTimeout(() => { refresh(); }, 30_000);
        return () => clearTimeout(timer);
    }, [hasLoading, refresh]);

    return (
        <>
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
                    <InfoIconButton
                        onClick={() => setInfoOpen(true)}
                        label="Показать описание сканера"
                    />
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

        {/* Info dialog */}
        <InfoDialog
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            title="Scanner"
            subtitle="Мультиинструментный сканер трендов"
        >
            {/* ── Lead ── */}
            <p className="text-white/70">
                Сканер в реальном времени оценивает 7 инструментов по единой методологии
                трендовой торговли (горизонт 21–30 дней). Данные обновляются каждые 6 часов.
                Нажмите на строку символа — график и HTF-контекст внизу переключатся на него.
            </p>

            {/* ── Columns ── */}
            <h4 className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Колонки таблицы
            </h4>

            {/* Сигнал */}
            <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-1">Сигнал</p>
                <p className="text-white/60 text-[12px]">
                    Итоговый вывод движка — агрегирует все фильтры в один ответ.
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px]">
                    <li>
                        <span className="font-bold" style={{ color: "#34d399" }}>READY</span>
                        {" "}— все условия выровнены: бычий макрос, благоприятный контекст,
                        нет серьёзных предупреждений, цена не у сопротивления. Можно искать вход.
                    </li>
                    <li>
                        <span className="font-bold" style={{ color: "#fbbf24" }}>WAIT</span>
                        {" "}— рынок в правильном направлении, но что-то ещё не подтверждено:
                        слабый ADX, нет momentum, EMA не выстроены. Ждать улучшения условий.
                    </li>
                    <li>
                        <span className="font-bold" style={{ color: "#fb923c" }}>CAUTION</span>
                        {" "}— медвежий или переходный рынок, либо сигнал высокого риска
                        (вход у сильного сопротивления, контртренд). Не входить.
                    </li>
                </ul>
            </div>

            {/* Режим */}
            <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-1">Режим</p>
                <p className="text-white/60 text-[12px]">
                    Положение цены относительно EMA 50 / 150 / 200 на дневном таймфрейме.
                    Показывает качество текущего ценового тренда.
                </p>
                <ul className="mt-2 space-y-1 text-[12px]">
                    <li><span className="font-semibold" style={{ color: "#34d399" }}>↑↑ STRONG UP</span> — цена выше EMA200 (растущий), EMA50 &gt; EMA200.</li>
                    <li><span className="font-semibold" style={{ color: "#86efac" }}>↑ UPTREND</span> — цена выше EMA200, но расположение EMA не идеальное.</li>
                    <li><span className="font-semibold" style={{ color: "#94a3b8" }}>→ NEUTRAL</span> — цена в ±3% от EMA200 (зона средней).</li>
                    <li><span className="font-semibold" style={{ color: "#f87171" }}>↓ DOWN</span> — цена ниже EMA200 (падающий), EMA50 &lt; EMA200.</li>
                    <li><span className="font-semibold" style={{ color: "#fb923c" }}>🔥 HOT</span> — цена выше EMA200 более чем на 20% (перегрев).</li>
                </ul>
            </div>

            {/* Macro */}
            <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-1">Macro</p>
                <p className="text-white/60 text-[12px]">
                    Структура недельных свингов. Главный цензор: пока Macro ≠ bullish —
                    сигнал не может быть READY. Требует 3 подряд Higher Highs +
                    3 подряд Higher Lows на недельном графике.
                </p>
                <ul className="mt-2 space-y-1 text-[12px]">
                    <li><span className="font-semibold" style={{ color: "#34d399" }}>bullish</span> — 3+ последовательных HH и HL на недельном.</li>
                    <li><span className="font-semibold" style={{ color: "#f87171" }}>bearish</span> — 3+ последовательных LH и LL на недельном.</li>
                    <li><span className="font-semibold" style={{ color: "#fbbf24" }}>transition</span> — структура сломана (CHoCH), новое направление не подтверждено.</li>
                    <li><span className="font-semibold" style={{ color: "#a78bfa" }}>range</span> — боковик: нет достаточного числа последовательных свингов.</li>
                </ul>
            </div>

            {/* ADX */}
            <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-1">ADX</p>
                <p className="text-white/60 text-[12px]">
                    Average Directional Index (14 недель, Wilder). Измеряет <em>силу</em> тренда,
                    не его направление. При ADX ниже 20 тренд-стратегия автоматически
                    переходит в режим WAIT — торговать в боковике нет смысла.
                </p>
                <ul className="mt-2 space-y-1 text-[12px] text-white/60">
                    <li>&lt; 20 — боковик, стратегия выключена</li>
                    <li>20–25 — тренд зарождается</li>
                    <li>&gt; 25 — уверенный тренд, стратегия активна</li>
                    <li>&gt; 50 — очень сильный тренд, возможен перегрев</li>
                </ul>
            </div>

            {/* RSI */}
            <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-1">RSI</p>
                <p className="text-white/60 text-[12px]">
                    RSI(14) на дневных свечах. В бычьем рынке нормальный диапазон —
                    40–90 (не классические 30–70). Откат RSI к зоне 40–55 в восходящем
                    тренде — лучшая точка входа. Выше 70 в бычьем рынке — норма, не сигнал разворота.
                </p>
            </div>

            {/* ── Boolean columns ── */}
            <h4 className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Индикаторы ↑ / ↓
            </h4>
            <p className="mt-1 text-[12px] text-white/50">
                <span className="font-bold text-emerald-400">↑</span> — условие выполнено,{" "}
                <span className="font-bold text-red-400">↓</span> — не выполнено,{" "}
                <span className="text-white/30">—</span> — данных недостаточно.
            </p>

            {/* Mom12w */}
            <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-1">Mom12w — 12-недельный моментум</p>
                <p className="text-white/60 text-[12px]">
                    Цена сейчас выше (↑) или ниже (↓) уровня 12 недель назад.
                    Академический бенчмарк Moskowitz 2012 (Time-Series Momentum).
                    Если ↓ — движок блокирует вход даже при хорошем Режиме:
                    входить против 3-месячного моментума значит торговать контртренд.
                </p>
            </div>

            {/* Wein */}
            <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-1">Wein — Weinstein Stage 2</p>
                <p className="text-white/60 text-[12px]">
                    Цена выше 30-недельной SMA (↑) — признак Стадии 2 по методу Стэна Вайнштейна.
                    Stage 2 — зона активного восходящего тренда; именно здесь совершаются
                    лучшие трендовые входы. Ниже SMA(30w) (↓) — акцент в боковике или нисходящем тренде.
                </p>
            </div>

            {/* Min */}
            <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60 mb-1">Min — Minervini Trend Template</p>
                <p className="text-white/60 text-[12px]">
                    Самый строгий структурный фильтр. ↑ означает одновременное выполнение
                    всех трёх условий: EMA50 &gt; EMA150, EMA150 &gt; EMA200, и все три EMA
                    должны быть направлены вверх. Это «идеальное» расположение скользящих
                    по методу Марка Минервини (SEPA). ↓ — хотя бы одно условие нарушено.
                </p>
            </div>

            {/* ── Logic ── */}
            <h4 className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Как читать строку целиком
            </h4>
            <p className="mt-2 text-[12px] text-white/60">
                Для сигнала <span className="font-bold text-emerald-400">READY</span> необходимо:
                Macro = bullish → Режим = uptrend → нет HIGH-предупреждений → ADX &gt; 20 →
                Mom12w ↑ → цена не у сопротивления. Чем больше зелёных ↑, тем ближе
                инструмент к входу при улучшении Macro и Сигнала.
            </p>
            <p className="mt-2 text-[12px] text-white/60">
                Данные кэшируются на сервере на 6 часов. Кнопка ↻ принудительно
                обновляет таблицу (данные пересчитываются в фоне — может занять до 2 минут
                для инструментов с внешним API).
            </p>

            <p className="mt-4 text-[11px] text-white/30">
                Это не финансовый совет. Сканер — инструмент анализа, а не торговый сигнал.
            </p>
        </InfoDialog>
        </>
    );
}
