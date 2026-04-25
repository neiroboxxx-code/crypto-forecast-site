"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

type TradeDay = {
    id: string;
    dateLabel: string;
    dowLabel: string;
    symbol: string;
    direction: "long" | "short";
    entry: number;
    stop: number;
    profit: number;
    outcome: "hit" | "miss";
};

const MOCK_WEEK: TradeDay[] = [
    {
        id: "2026-04-20",
        dowLabel: "Mon",
        dateLabel: "Apr 20",
        symbol: "BTCUSDT",
        direction: "long",
        entry: 65320,
        stop: 64680,
        profit: 66740,
        outcome: "hit",
    },
    {
        id: "2026-04-21",
        dowLabel: "Tue",
        dateLabel: "Apr 21",
        symbol: "ETHUSDT",
        direction: "short",
        entry: 3215,
        stop: 3286,
        profit: 3078,
        outcome: "miss",
    },
    {
        id: "2026-04-22",
        dowLabel: "Wed",
        dateLabel: "Apr 22",
        symbol: "SOLUSDT",
        direction: "long",
        entry: 142.4,
        stop: 138.9,
        profit: 151.2,
        outcome: "hit",
    },
    {
        id: "2026-04-23",
        dowLabel: "Thu",
        dateLabel: "Apr 23",
        symbol: "BTCUSDT",
        direction: "short",
        entry: 67120,
        stop: 67880,
        profit: 65550,
        outcome: "hit",
    },
    {
        id: "2026-04-24",
        dowLabel: "Fri",
        dateLabel: "Apr 24",
        symbol: "ARBUSDT",
        direction: "long",
        entry: 1.156,
        stop: 1.112,
        profit: 1.241,
        outcome: "miss",
    },
    {
        id: "2026-04-25",
        dowLabel: "Sat",
        dateLabel: "Apr 25",
        symbol: "BNBUSDT",
        direction: "short",
        entry: 612.1,
        stop: 623.0,
        profit: 584.9,
        outcome: "hit",
    },
    {
        id: "2026-04-26",
        dowLabel: "Sun",
        dateLabel: "Apr 26",
        symbol: "BTCUSDT",
        direction: "long",
        entry: 66210,
        stop: 65510,
        profit: 67680,
        outcome: "miss",
    },
];

function fmt(n: number) {
    if (Math.abs(n) >= 1000 && Number.isInteger(n)) return n.toLocaleString("en-US");
    return String(n);
}

export function TradeCalendarView() {
    const [week] = useState(() => MOCK_WEEK);
    const meta = useMemo(() => {
        const hits = week.filter((d) => d.outcome === "hit").length;
        return { hits, total: week.length };
    }, [week]);

    return (
        <div className="flex flex-col gap-3">
            <Card
                title="Trade Calendar"
                subtitle="UI-заглушка: недельный календарь со «скрином» входа/цели и цифрами (entry / SL / TP)."
                padded
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] leading-relaxed text-white/55">
                        На этой странице позже будет реальная нарезка с графика и события из движка. Сейчас — визуальный
                        макет: неделя помещается целиком, каждый день — большая карточка.
                    </p>
                    <div className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
                        Win rate: {meta.hits}/{meta.total}
                    </div>
                </div>
            </Card>

            <section aria-label="Week view" className="rounded-2xl border border-white/8 bg-[#0E1117]/65 p-2.5">
                <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-4">
                    {week.map((d) => (
                        <DayCell key={d.id} day={d} />
                    ))}
                </div>
            </section>
        </div>
    );
}

function DayCell({ day }: { day: TradeDay }) {
    const side =
        day.direction === "long"
            ? { label: "LONG", fg: "text-emerald-200/90", bg: "bg-emerald-400/10", bd: "border-emerald-400/25" }
            : { label: "SHORT", fg: "text-rose-200/90", bg: "bg-rose-400/10", bd: "border-rose-400/25" };

    const outcome =
        day.outcome === "hit"
            ? { label: "TP hit", fg: "text-cyan-200/90", bg: "bg-cyan-400/10", bd: "border-cyan-400/25" }
            : { label: "TP miss", fg: "text-white/70", bg: "bg-white/5", bd: "border-white/10" };

    return (
        <article className="flex flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0B0D12]/70">
            <header className="flex items-center justify-between gap-2 border-b border-white/8 px-3 py-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                            {day.dowLabel}
                        </span>
                        <span className="text-[11px] text-white/40">{day.dateLabel}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] font-semibold text-white">{day.symbol}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${side.fg} ${side.bg} ${side.bd}`}
                    >
                        {side.label}
                    </span>
                    <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${outcome.fg} ${outcome.bg} ${outcome.bd}`}
                    >
                        {outcome.label}
                    </span>
                </div>
            </header>

            <div className="p-2.5">
                <ChartMock direction={day.direction} outcome={day.outcome} />
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                    <Metric label="Entry" value={fmt(day.entry)} />
                    <Metric label="Stop" value={fmt(day.stop)} tone="danger" />
                    <Metric label="Profit" value={fmt(day.profit)} tone={day.outcome === "hit" ? "accent" : "muted"} />
                </div>
            </div>

            <div className="border-t border-white/8 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                    Скрин: entry → TP (заглушка)
                </div>
            </div>
        </article>
    );
}

function Metric({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone?: "default" | "danger" | "accent" | "muted";
}) {
    const t = tone ?? "default";
    const valueClass =
        t === "danger"
            ? "text-rose-200"
            : t === "accent"
              ? "text-cyan-200"
              : t === "muted"
                ? "text-white/60"
                : "text-white/85";

    return (
        <div className="rounded-lg border border-white/8 bg-black/25 px-2 py-1.5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</div>
            <div className={`mt-0.5 truncate font-semibold tabular-nums ${valueClass}`}>{value}</div>
        </div>
    );
}

function ChartMock({ direction, outcome }: { direction: "long" | "short"; outcome: "hit" | "miss" }) {
    const accent = direction === "long" ? "#34d399" : "#fb7185";
    const tp = outcome === "hit" ? "#22d3ee" : "#94a3b8";

    return (
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-white/8 bg-black/40">
            <div className="absolute inset-0 opacity-80">
                <div
                    className="h-full w-full"
                    style={{
                        backgroundImage:
                            "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
                        backgroundSize: "28px 28px",
                    }}
                />
            </div>

            <svg viewBox="0 0 600 360" className="relative block h-full w-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="bgFade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="rgba(34,211,238,0.08)" />
                        <stop offset="1" stopColor="rgba(0,0,0,0)" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <rect x="0" y="0" width="600" height="360" fill="url(#bgFade)" />

                {/* price path */}
                <path
                    d="M 10 250 C 80 260, 120 170, 170 190 C 230 215, 260 120, 320 135 C 380 150, 410 90, 465 105 C 520 120, 545 70, 590 85"
                    fill="none"
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth="2"
                />
                <path
                    d="M 10 250 C 80 260, 120 170, 170 190 C 230 215, 260 120, 320 135 C 380 150, 410 90, 465 105 C 520 120, 545 70, 590 85"
                    fill="none"
                    stroke={accent}
                    strokeWidth="2.5"
                    opacity="0.9"
                    filter="url(#glow)"
                />

                {/* markers */}
                <line x1="210" y1="40" x2="210" y2="330" stroke="rgba(255,255,255,0.14)" strokeDasharray="6 6" />
                <circle cx="210" cy="205" r="7" fill={accent} opacity="0.95" />
                <text x="226" y="210" fontSize="12" fill="rgba(255,255,255,0.8)" fontFamily="ui-sans-serif">
                    entry
                </text>

                <line x1="460" y1="40" x2="460" y2="330" stroke="rgba(255,255,255,0.14)" strokeDasharray="6 6" />
                <circle cx="460" cy="112" r="7" fill={tp} opacity="0.95" />
                <text x="476" y="117" fontSize="12" fill="rgba(255,255,255,0.78)" fontFamily="ui-sans-serif">
                    {outcome === "hit" ? "TP" : "TP?"}
                </text>

                <line x1="210" y1="310" x2="585" y2="310" stroke="rgba(251,113,133,0.55)" strokeDasharray="8 6" />
                <text x="18" y="320" fontSize="12" fill="rgba(251,113,133,0.78)" fontFamily="ui-sans-serif">
                    SL
                </text>
            </svg>

            <div className="absolute bottom-2 left-2 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
                Screenshot placeholder
            </div>
        </div>
    );
}

