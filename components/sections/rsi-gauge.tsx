"use client";

import React, { useEffect, useState } from "react";
import { getReversal, type ForecastFactor, type ReversalDiagnostics } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── SVG константы ─────────────────────────────────────────────────────────

const CX = 90, CY = 90;       // центр
const R  = 68;                 // радиус дорожки
const TW = 12;                 // ширина дорожки (stroke)
const NL = 56;                 // длина иглы от центра
const START = 135;             // начальный угол (135° = 7.5 часов)
const SWEEP = 270;             // общий размах

function toRad(d: number) { return d * Math.PI / 180; }

function pt(deg: number, r: number) {
    return {
        x: +(CX + r * Math.cos(toRad(deg))).toFixed(2),
        y: +(CY + r * Math.sin(toRad(deg))).toFixed(2),
    };
}

function arc(a1: number, a2: number, r = R): string {
    const s = pt(a1, r);
    const e = pt(a2, r);
    const la = (a2 - a1) > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${la} 1 ${e.x} ${e.y}`;
}

function rsiToDeg(rsi: number): number {
    return START + (Math.max(0, Math.min(100, rsi)) / 100) * SWEEP;
}

// ── Зоны ─────────────────────────────────────────────────────────────────

const ZONES = [
    { from: 0,  to: 30,  color: "#34d399", dim: "rgba(52,211,153,0.18)",  label: "Перепродан",    hint: "Возможный разворот вверх", textCls: "text-emerald-400" },
    { from: 30, to: 50,  color: "#f87171", dim: "rgba(248,113,113,0.15)", label: "Медвежья зона", hint: "Давление вниз",             textCls: "text-rose-400"   },
    { from: 50, to: 70,  color: "#22d3ee", dim: "rgba(34,211,238,0.14)",  label: "Бычья зона",    hint: "Давление вверх",            textCls: "text-cyan-400"   },
    { from: 70, to: 100, color: "#fb923c", dim: "rgba(251,146,60,0.18)",  label: "Перекуплен",    hint: "Возможный разворот вниз",   textCls: "text-amber-400"  },
] as const;

function zoneFor(rsi: number) {
    return ZONES.find(z => rsi >= z.from && rsi < z.to) ?? ZONES[ZONES.length - 1];
}

// ── Круглый спидометр ─────────────────────────────────────────────────────

function Gauge({ rsi, label, uid }: { rsi: number; label: string; uid: string }) {
    const [animated, setAnimated] = useState(50);

    useEffect(() => {
        const t = setTimeout(() => setAnimated(rsi), 200);
        return () => clearTimeout(t);
    }, [rsi]);

    const zone    = zoneFor(rsi);
    const needDeg = rsiToDeg(animated);
    const filterId = `glow-${uid}`;

    // Геометрия иглы всегда в базовой позиции (START=135°),
    // поворот управляется только CSS transform — без двойной трансформации.
    const baseEnd  = pt(START, NL);
    const baseTip1 = pt(START + 90, 6);
    const baseTip2 = pt(START - 90, 6);
    const needleStyle: React.CSSProperties = {
        transformOrigin: `${CX}px ${CY}px`,
        transform: `rotate(${needDeg - START}deg)`,
        transition: "transform 1.4s cubic-bezier(0.34, 1.4, 0.64, 1)",
    };

    return (
        <div className="flex flex-col items-center gap-1.5">
            <svg viewBox="0 0 180 180" width={150} height={150}>
                <defs>
                    <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Фоновая дорожка */}
                <path
                    d={arc(START, START + SWEEP)}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={TW}
                    strokeLinecap="round"
                />

                {/* Неактивные зоны */}
                {ZONES.map(z => {
                    if (z === zone) return null;
                    const a1 = START + (z.from / 100) * SWEEP;
                    const a2 = START + (z.to   / 100) * SWEEP;
                    return (
                        <path key={z.from}
                            d={arc(a1, a2)}
                            fill="none"
                            stroke={z.dim}
                            strokeWidth={TW}
                        />
                    );
                })}

                {/* Активная зона — светится */}
                {(() => {
                    const a1 = START + (zone.from / 100) * SWEEP;
                    const a2 = START + (zone.to   / 100) * SWEEP;
                    return (
                        <>
                            {/* Широкий glow под зоной */}
                            <path
                                d={arc(a1, a2)}
                                fill="none"
                                stroke={zone.color}
                                strokeWidth={TW + 8}
                                strokeOpacity="0.18"
                                filter={`url(#${filterId})`}
                            />
                            {/* Сама зона — яркая */}
                            <path
                                d={arc(a1, a2)}
                                fill="none"
                                stroke={zone.color}
                                strokeWidth={TW}
                                strokeOpacity="0.85"
                            />
                        </>
                    );
                })()}

                {/* Игла */}
                <line
                    x1={CX} y1={CY}
                    x2={baseEnd.x} y2={baseEnd.y}
                    stroke={zone.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 5px ${zone.color})`, ...needleStyle }}
                />
                {/* Треугольный кончик иглы */}
                <polygon
                    points={`${baseTip1.x},${baseTip1.y} ${baseEnd.x},${baseEnd.y} ${baseTip2.x},${baseTip2.y}`}
                    fill={zone.color}
                    opacity="0.85"
                    style={{ filter: `drop-shadow(0 0 6px ${zone.color})`, ...needleStyle }}
                />

                {/* Центральная заглушка */}
                <circle cx={CX} cy={CY} r="7"
                    fill="#080c12"
                    stroke={zone.color} strokeWidth="1.5" strokeOpacity="0.55"
                />

                {/* RSI значение в центре */}
                <text x={CX} y={CY - 14}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={zone.color}
                    fontSize="28" fontWeight="700" fontFamily="monospace"
                    style={{ filter: `drop-shadow(0 0 10px ${zone.color}90)` }}
                >
                    {rsi.toFixed(1)}
                </text>

                {/* Название зоны под значением */}
                <text x={CX} y={CY + 10}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={zone.color} fillOpacity="0.65"
                    fontSize="9" fontFamily="sans-serif" fontWeight="600"
                    letterSpacing="1.2"
                >
                    {zone.label.toUpperCase()}
                </text>

                {/* Метки 0 / 50 / 100 */}
                {([0, 50, 100] as const).map(v => {
                    const p = pt(START + (v / 100) * SWEEP, R + 12);
                    return (
                        <text key={v} x={p.x} y={p.y}
                            textAnchor="middle" dominantBaseline="middle"
                            fill="rgba(255,255,255,0.22)" fontSize="8" fontFamily="monospace"
                        >{v}</text>
                    );
                })}
            </svg>

            {/* Подпись таймфрейма под кругом */}
            <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30 -mt-1">
                {label}
            </div>
        </div>
    );
}

// ── Contribution bar ──────────────────────────────────────────────────────

function ContribBar({ value }: { value: number }) {
    // value диапазон примерно -2..+2 (RSI вклад в прогноз)
    const MAX = 2;
    const pct = Math.max(0, Math.min(100, ((value + MAX) / (MAX * 2)) * 100));
    const isBear = value < 0;
    const color = isBear ? "#f87171" : "#34d399";
    const label = isBear
        ? `Медвежий · ${value.toFixed(2)}`
        : `Бычий · +${value.toFixed(2)}`;

    return (
        <div className="space-y-1.5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                Вклад RSI в прогноз
            </div>
            <div className="relative h-2 rounded-full bg-white/6 overflow-hidden">
                {/* Центральная отметка */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                {/* Заполнение */}
                <div
                    className="absolute top-0 bottom-0 rounded-full transition-all duration-700"
                    style={{
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}80`,
                        left: value < 0 ? `${pct}%` : "50%",
                        right: value < 0 ? "50%" : `${100 - pct}%`,
                    }}
                />
            </div>
            <div className="text-[11px] font-semibold" style={{ color }}>
                {label}
            </div>
        </div>
    );
}

// ── Правая панель ─────────────────────────────────────────────────────────

function InfoPanel({ diag, rsiFactor }: {
    diag: ReversalDiagnostics;
    rsiFactor: ForecastFactor | undefined;
}) {
    const contrib    = rsiFactor?.contribution ?? 0;
    const momentum   = diag.momentum_slowdown_status_4h;
    const isSlowing  = momentum === "slowing";
    const rsi4h      = diag.latest_rsi_4h ?? 50;
    const rsi1d      = diag.latest_rsi_1d ?? 50;
    const zone4h     = zoneFor(rsi4h);
    const zone1d     = zoneFor(rsi1d);

    return (
        <div className="flex flex-col gap-4 text-[11px]">

            {/* Contribution bar */}
            <ContribBar value={contrib} />

            {/* Разделитель */}
            <div className="h-px bg-white/6" />

            {/* Таблица состояний */}
            <div className="space-y-2.5">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Текущее состояние
                </div>

                {/* RSI 4H зона */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-white/40">RSI 4H</span>
                    <span className={`font-semibold text-[11px] ${zone4h.textCls}`}
                        style={{ filter: `drop-shadow(0 0 6px ${zone4h.color}60)` }}>
                        {zone4h.label}
                    </span>
                </div>

                {/* RSI 1D зона */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-white/40">RSI 1D</span>
                    <span className={`font-semibold text-[11px] ${zone1d.textCls}`}
                        style={{ filter: `drop-shadow(0 0 6px ${zone1d.color}60)` }}>
                        {zone1d.label}
                    </span>
                </div>

                {/* Импульс */}
                <div className="flex items-center justify-between gap-2">
                    <span className="text-white/40">Импульс 4H</span>
                    <span className={`font-semibold ${isSlowing ? "text-amber-300" : "text-white/50"}`}>
                        {isSlowing ? "↓ замедляется" : "→ стабильный"}
                    </span>
                </div>
            </div>

            {/* Разделитель */}
            <div className="h-px bg-white/6" />

            {/* Легенда зон — компактная */}
            <div className="space-y-1.5">
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/30">
                    Зоны
                </div>
                {ZONES.map(z => (
                    <div key={z.from} className="flex items-center gap-2">
                        <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: z.color, boxShadow: `0 0 5px ${z.color}80` }}
                        />
                        <span className="font-mono text-[9px] text-white/25 w-8 shrink-0">{z.from}–{z.to}</span>
                        <span className="text-white/45 text-[10px]">{z.hint}</span>
                    </div>
                ))}
            </div>

        </div>
    );
}

// ── Основной компонент ───────────────────────────────────────────────────

export function RsiGauges() {
    const { data, loading } = useApi(getReversal, [], { intervalMs: 4 * 60 * 60 * 1000 });

    const diag      = data?.diagnostics;
    const rsi4h     = diag?.latest_rsi_4h;
    const rsi1d     = diag?.latest_rsi_1d;
    const rsiFactor = data?.forecast?.factors?.find((f: ForecastFactor) => f.name === "RSI");

    if (loading && !data) {
        return (
            <Card title="RSI Monitor" subtitle="Индикатор импульса" padded>
                <Skeleton className="h-40 w-full rounded-xl" />
            </Card>
        );
    }

    if (rsi4h === undefined || rsi1d === undefined) return null;

    return (
        <Card title="RSI Monitor" subtitle="Индикатор перекупленности / перепроданности" padded>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">

                {/* Два круглых спидометра */}
                <div className="flex gap-2 shrink-0 justify-center sm:justify-start">
                    <Gauge rsi={rsi4h} label="RSI · 4H" uid="rsi4h" />
                    <Gauge rsi={rsi1d} label="RSI · 1D" uid="rsi1d" />
                </div>

                {/* Вертикальный разделитель */}
                <div className="hidden sm:block w-px self-stretch bg-white/8" />

                {/* Правая панель */}
                <div className="flex-1 min-w-0">
                    <InfoPanel diag={diag!} rsiFactor={rsiFactor} />
                </div>
            </div>
        </Card>
    );
}
