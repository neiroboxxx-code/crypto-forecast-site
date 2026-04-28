"use client";

import { useEffect, useState } from "react";
import { getReversal, type ForecastFactor, type ReversalDiagnostics } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── SVG геометрия ─────────────────────────────────────────────────────────

const CX = 100, CY = 92;
const R_OUT = 72, R_IN = 54;
const R_NEEDLE = 66;

function rsiPt(rsi: number, r: number): [number, number] {
    const theta = Math.PI * (1 - Math.max(0, Math.min(100, rsi)) / 100);
    return [+(CX + r * Math.cos(theta)).toFixed(2), +(CY - r * Math.sin(theta)).toFixed(2)];
}

function arcSeg(from: number, to: number): string {
    const [x1o, y1o] = rsiPt(from, R_OUT);
    const [x2o, y2o] = rsiPt(to,   R_OUT);
    const [x1i, y1i] = rsiPt(from, R_IN);
    const [x2i, y2i] = rsiPt(to,   R_IN);
    const la = (to - from) > 50 ? 1 : 0;
    return [
        `M ${x1o} ${y1o}`,
        `A ${R_OUT} ${R_OUT} 0 ${la} 0 ${x2o} ${y2o}`,
        `L ${x2i} ${y2i}`,
        `A ${R_IN} ${R_IN} 0 ${la} 1 ${x1i} ${y1i}`,
        "Z",
    ].join(" ");
}

// ── Конфиг зон ───────────────────────────────────────────────────────────

const ZONES = [
    { from: 0,  to: 30,  fill: "rgba(52,211,153,0.22)",  color: "#34d399", label: "Перепродан",    textCls: "text-emerald-400" },
    { from: 30, to: 50,  fill: "rgba(248,113,113,0.18)", color: "#f87171", label: "Медвежья зона", textCls: "text-rose-400"   },
    { from: 50, to: 70,  fill: "rgba(34,211,238,0.16)",  color: "#22d3ee", label: "Бычья зона",    textCls: "text-cyan-400"   },
    { from: 70, to: 100, fill: "rgba(251,146,60,0.22)",  color: "#fb923c", label: "Перекуплен",    textCls: "text-amber-400"  },
] as const;

function zoneFor(rsi: number) {
    return ZONES.find((z) => rsi >= z.from && rsi < z.to) ?? ZONES[ZONES.length - 1];
}

// ── Одиночный спидометр ──────────────────────────────────────────────────

function Gauge({ rsi, timeframe, uid }: { rsi: number; timeframe: string; uid: string }) {
    const [animated, setAnimated] = useState(50);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(rsi), 180);
        return () => clearTimeout(t);
    }, [rsi]);

    const zone = zoneFor(rsi);
    const needleDeg = -90 + (animated / 100) * 180;

    return (
        <div className="flex flex-col items-center gap-1">
            {/* Подпись таймфрейма */}
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30">
                {timeframe}
            </div>

            <svg viewBox="0 0 200 102" width={158} height={81} style={{ overflow: "visible" }}>
                <defs>
                    {/* Glow-фильтр для иглы */}
                    <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    {/* Glow-фильтр для подсветки дуги */}
                    <filter id={`glow-arc-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Серая подложка */}
                <path d={arcSeg(0, 100)} fill="rgba(255,255,255,0.04)" />

                {/* Цветные зоны */}
                {ZONES.map((z) => (
                    <path key={z.from} d={arcSeg(z.from, z.to)} fill={z.fill} />
                ))}

                {/* Активная зона — выделение неоном */}
                <path
                    d={arcSeg(zone.from, zone.to)}
                    fill="transparent"
                    stroke={zone.color}
                    strokeWidth="1"
                    strokeOpacity="0.35"
                    filter={`url(#glow-arc-${uid})`}
                />

                {/* Разделительные риски на 30 / 50 / 70 */}
                {[30, 50, 70].map((v) => {
                    const [x1, y1] = rsiPt(v, R_IN  - 2);
                    const [x2, y2] = rsiPt(v, R_OUT + 3);
                    return (
                        <line key={v}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="rgba(255,255,255,0.18)" strokeWidth="1"
                        />
                    );
                })}

                {/* Метки снаружи */}
                {([0, 30, 50, 70, 100] as const).map((v) => {
                    const [x, y] = rsiPt(v, R_OUT + 12);
                    return (
                        <text key={v} x={x} y={y}
                            textAnchor="middle" dominantBaseline="middle"
                            fill="rgba(255,255,255,0.25)" fontSize="7" fontFamily="monospace"
                        >
                            {v}
                        </text>
                    );
                })}

                {/* Игла — анимируется через CSS transform */}
                <g
                    style={{
                        transform: `rotate(${needleDeg}deg)`,
                        transformOrigin: `${CX}px ${CY}px`,
                        transition: "transform 1.35s cubic-bezier(0.34, 1.46, 0.64, 1)",
                    }}
                    filter={`url(#glow-${uid})`}
                >
                    <polygon
                        points={`${CX},${CY - R_NEEDLE} ${CX - 2.8},${CY + 8} ${CX + 2.8},${CY + 8}`}
                        fill={zone.color}
                        opacity="0.95"
                    />
                </g>

                {/* Центральная заглушка */}
                <circle cx={CX} cy={CY} r="5.5"
                    fill="#080c12"
                    stroke={zone.color} strokeWidth="1.5" strokeOpacity="0.6"
                />
            </svg>

            {/* Числовое значение */}
            <div
                className="font-mono text-[21px] font-bold tabular-nums leading-none -mt-1"
                style={{ color: zone.color, filter: `drop-shadow(0 0 8px ${zone.color}60)` }}
            >
                {rsi.toFixed(1)}
            </div>

            {/* Название зоны */}
            <div className={`text-[10px] font-semibold ${zone.textCls}`}>
                {zone.label}
            </div>
        </div>
    );
}

// ── Панель объяснения ────────────────────────────────────────────────────

function InfoPanel({
    diag,
    rsiFactor,
}: {
    diag: ReversalDiagnostics;
    rsiFactor: ForecastFactor | undefined;
}) {
    const momentum = diag.momentum_slowdown_status_4h;
    const momentumLabel = momentum === "slowing" ? "замедляется ↓" : momentum === "not_slowing" ? "стабильный →" : "—";
    const momentumCls  = momentum === "slowing" ? "text-amber-300" : "text-white/50";

    const contrib = rsiFactor?.contribution;
    const contribStr = contrib !== undefined
        ? `${contrib > 0 ? "+" : ""}${contrib.toFixed(2)}`
        : "—";
    const contribCls = contrib !== undefined
        ? contrib > 0 ? "text-emerald-400" : "text-rose-400"
        : "text-white/40";

    const bias4h = diag.bias_4h ?? "—";
    const biasCls = bias4h === "bullish" ? "text-emerald-400" : bias4h === "bearish" ? "text-rose-400" : "text-white/50";

    return (
        <div className="flex flex-col gap-3 text-[11px] leading-relaxed">
            {/* Вклад в прогноз */}
            <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5 space-y-1.5">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30 mb-1">
                    Влияние на прогноз
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-white/45">Вклад RSI</span>
                    <span className={`font-mono font-semibold ${contribCls}`}>{contribStr}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-white/45">Импульс 4H</span>
                    <span className={`font-semibold ${momentumCls}`}>{momentumLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <span className="text-white/45">Байас 4H</span>
                    <span className={`font-semibold capitalize ${biasCls}`}>{bias4h}</span>
                </div>
            </div>

            {/* Легенда зон */}
            <div className="space-y-1.5">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/30">
                    Зоны RSI
                </div>
                {ZONES.map((z) => (
                    <div key={z.from} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: z.color, boxShadow: `0 0 5px ${z.color}80` }} />
                        <span className="text-white/35 font-mono text-[10px] w-9 shrink-0">{z.from}–{z.to}</span>
                        <span className="text-white/55">{z.label}</span>
                    </div>
                ))}
            </div>

            {/* Краткое пояснение */}
            <p className="text-[10px] leading-relaxed text-white/30">
                RSI измеряет скорость и величину ценовых движений. Экстремальные значения
                сигнализируют о возможном развороте. Вес фактора в прогнозе — 1.5×.
            </p>
        </div>
    );
}

// ── Основной компонент ───────────────────────────────────────────────────

export function RsiGauges() {
    const { data, loading } = useApi(getReversal, [], { intervalMs: 4 * 60 * 60 * 1000 });

    const diag = data?.diagnostics;
    const rsi4h = diag?.latest_rsi_4h;
    const rsi1d = diag?.latest_rsi_1d;
    const rsiFactor = data?.forecast?.factors?.find((f: ForecastFactor) => f.name === "RSI");

    if (loading && !data) {
        return (
            <Card title="RSI Monitor" subtitle="Индикатор импульса" padded>
                <Skeleton className="h-32 w-full rounded-xl" />
            </Card>
        );
    }

    if (rsi4h === undefined || rsi1d === undefined) return null;

    return (
        <Card title="RSI Monitor" subtitle="Индикатор перекупленности / перепроданности" padded>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                {/* Два спидометра */}
                <div className="flex gap-4 shrink-0">
                    <Gauge rsi={rsi4h} timeframe="RSI · 4H" uid="rsi4h" />
                    <Gauge rsi={rsi1d} timeframe="RSI · 1D" uid="rsi1d" />
                </div>

                {/* Вертикальный разделитель */}
                <div className="hidden sm:block w-px self-stretch bg-white/8" />

                {/* Панель информации */}
                <div className="flex-1 min-w-0">
                    <InfoPanel diag={diag!} rsiFactor={rsiFactor} />
                </div>
            </div>
        </Card>
    );
}
