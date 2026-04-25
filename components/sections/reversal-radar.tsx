"use client";

import { useEffect, useState } from "react";
import { getReversal, type Forecast, type ForecastHorizon, type ReversalCandidate, type ReversalData } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { fmtPrice, fmtTime } from "@/lib/format";

// ---------------------------------------------------------------------------
// Forecast block
// ---------------------------------------------------------------------------

function probPct(p: number): string {
    return `${Math.round(p * 100)}%`;
}

function horizonToneClass(d: ForecastHorizon["direction"]): string {
    if (d === "bull") return "text-emerald-400";
    if (d === "bear") return "text-rose-400";
    return "text-cyan-300";
}

function horizonBorderClass(d: ForecastHorizon["direction"]): string {
    if (d === "bull") return "border-emerald-400/20 bg-emerald-400/[0.04]";
    if (d === "bear") return "border-rose-400/20 bg-rose-400/[0.04]";
    return "border-white/10 bg-white/[0.02]";
}

function confidenceBadgeClass(c: ForecastHorizon["confidence"]): string {
    if (c === "high") return "border-emerald-400/30 text-emerald-300/70";
    if (c === "medium") return "border-amber-400/30 text-amber-300/70";
    return "border-white/15 text-white/40";
}

function ForecastBox({ horizon, label }: { horizon: ForecastHorizon; label: string }) {
    const tone = horizonToneClass(horizon.direction);
    const border = horizonBorderClass(horizon.direction);
    const badgeCls = confidenceBadgeClass(horizon.confidence);
    return (
        <div className={`flex-1 rounded-xl border p-3 ${border}`}>
            <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-white/35">{label}</div>
            <div className={`text-2xl font-bold tabular-nums tracking-tight ${tone}`}>
                {probPct(horizon.probability)}
            </div>
            <div className={`mt-0.5 text-[11px] font-medium ${tone}`}>{horizon.label}</div>
            <div className={`mt-2 inline-block rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${badgeCls}`}>
                {horizon.confidence}
            </div>
        </div>
    );
}

function FactorStrip({ forecast }: { forecast: Forecast }) {
    const bull = forecast.factors
        .filter((f) => f.signal === "bull" && f.contribution > 0)
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 3);
    const bear = forecast.factors
        .filter((f) => f.signal === "bear" && f.contribution < 0)
        .sort((a, b) => a.contribution - b.contribution)
        .slice(0, 3);

    if (bull.length === 0 && bear.length === 0) return null;

    return (
        <div className="mt-3 flex flex-wrap gap-1.5">
            {bull.map((f) => (
                <span
                    key={f.name}
                    className="rounded border border-emerald-400/20 bg-emerald-400/[0.06] px-1.5 py-0.5 text-[9px] text-emerald-300/80"
                >
                    ↑ {f.name}
                </span>
            ))}
            {bear.map((f) => (
                <span
                    key={f.name}
                    className="rounded border border-rose-400/20 bg-rose-400/[0.06] px-1.5 py-0.5 text-[9px] text-rose-300/80"
                >
                    ↓ {f.name}
                </span>
            ))}
        </div>
    );
}

function ForecastSection({ forecast }: { forecast: Forecast }) {
    return (
        <div>
            <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-white/30">
                Directional Bias · Next 2 candles
            </div>
            <div className="flex gap-2">
                <ForecastBox horizon={forecast.forecast_4h} label="+4H" />
                <ForecastBox horizon={forecast.forecast_8h} label="+8H" />
            </div>
            <FactorStrip forecast={forecast} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Candidates table
// ---------------------------------------------------------------------------

function dirTone(d: string): string {
    if (d === "bullish") return "text-emerald-400";
    if (d === "bearish") return "text-rose-400";
    return "text-cyan-300";
}

function dirLabel(d: string): string {
    if (d === "bullish") return "LONG";
    if (d === "bearish") return "SHORT";
    return d.toUpperCase();
}

function classTone(c: string): string {
    if (c === "high") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-300";
    if (c === "medium") return "border-amber-400/40 bg-amber-400/10 text-amber-300";
    return "border-white/15 bg-white/5 text-white/55";
}

function classLabel(c: string): string {
    if (c === "high") return "STRONG";
    if (c === "medium") return "MID";
    if (c === "low") return "WEAK";
    return c.toUpperCase();
}

function CandidateRow({ c }: { c: ReversalCandidate }) {
    return (
        <div className="grid grid-cols-[72px_92px_100px_110px_1fr_68px] items-center gap-3 border-b border-white/6 py-2.5 text-[12px] last:border-b-0">
            <div className={`font-semibold tracking-tight ${dirTone(c.direction)}`}>
                {dirLabel(c.direction)}
            </div>
            <div className="tabular-nums text-white/60">
                {c.timeframe_main} · {fmtTime(c.event_timestamp)}
            </div>
            <div className="tabular-nums font-medium text-white">
                ${fmtPrice(c.trigger_price)}
            </div>
            <div>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${classTone(c.classification)}`}>
                    {classLabel(c.classification)}
                </span>
            </div>
            <div className="truncate text-white/55">
                {c.zone_interaction.zone_id} · ${fmtPrice(c.zone_interaction.low)}–${fmtPrice(c.zone_interaction.high)}
            </div>
            <div className="text-right tabular-nums font-semibold text-white">
                {c.scores.total_score.toFixed(1)}
                <span className="ml-0.5 text-[10px] text-white/35">/10</span>
            </div>
        </div>
    );
}

/** Тот же визуальный штамп, что и у времени обновления сигнала (шапка карточки). */
const META_STAMP_CLS =
    "rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/55 tabular-nums";

function LiveClockStamp() {
    const [text, setText] = useState<string>("--:--:--");

    useEffect(() => {
        const formatNow = () =>
            new Intl.DateTimeFormat("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }).format(new Date());

        setText(formatNow());
        const id = window.setInterval(() => setText(formatNow()), 1000);
        return () => window.clearInterval(id);
    }, []);

    return (
        <div className={META_STAMP_CLS} suppressHydrationWarning>
            {text}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export function ReversalRadar() {
    const { data, loading, error, refreshing } = useApi<ReversalData>(
        getReversal,
        [],
        { intervalMs: 4 * 60 * 60 * 1000 },
    );
    const [infoOpen, setInfoOpen] = useState(false);

    const candidates = data?.candidates ?? [];
    const forecast = data?.forecast;
    const engineOutputAt = data?.meta?.engine_output_at;

    const headerRight = (
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-1">
                {engineOutputAt && (
                    <div className={META_STAMP_CLS}>{fmtTime(engineOutputAt)}</div>
                )}
                <LiveClockStamp />
            </div>
            {refreshing && (
                <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-cyan-400/70" title="Обновление..." />
            )}
            <InfoIconButton onClick={() => setInfoOpen(true)} label="Показать пояснение" />
        </div>
    );

    return (
        <>
            <Card title="Reversal Radar" subtitle="Кандидаты разворота · 4H/1D (swing)" right={headerRight}>
                {loading && (
                    <div className="space-y-2">
                        <Skeleton className="h-24 w-full" />
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                )}

                {error && <ErrorState message={error} />}

                {data && (
                    <div className="space-y-4">
                        {/* Forecast — always present */}
                        {forecast && <ForecastSection forecast={forecast} />}

                        {/* Candidates */}
                        {candidates.length > 0 && (
                            <div className="border-t border-white/8 pt-3">
                                <div className="mb-1.5 text-[9px] uppercase tracking-[0.18em] text-white/30">
                                    Reversal Candidates
                                </div>
                                <div className="grid grid-cols-[72px_92px_100px_110px_1fr_68px] gap-3 border-b border-white/10 pb-1.5 text-[9px] uppercase tracking-[0.14em] text-white/35">
                                    <div>Dir</div>
                                    <div>TF · Time</div>
                                    <div>Trigger</div>
                                    <div>Grade</div>
                                    <div>Zone</div>
                                    <div className="text-right">Score</div>
                                </div>
                                <div>
                                    {candidates.map((c) => (
                                        <CandidateRow key={c.candidate_id} c={c} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <InfoDialog
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                title="Reversal Radar"
                subtitle="Bias Forecast + структурные развороты на 4H/1D"
            >
                <p>
                    Блок состоит из двух частей: прогноз направления и кандидаты разворота.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Directional Bias (верхняя часть)
                </h4>
                <p className="mt-2">
                    Всегда показывает прогноз — кто будет сильнее, когда закроется следующая 4H-свеча
                    (+4H) и следующая за ней (+8H). Процент — вероятность преобладания покупателей
                    (выше 50%) или продавцов (ниже 50%). Диапазон 10–90%: движок не даёт 0% или 100%.
                </p>
                <ul className="mt-2 space-y-1.5 text-[12px]">
                    <li><span className="text-emerald-400 font-semibold">LONG BIAS</span> — вероятность, что покупатели закроют свечу сильнее продавцов.</li>
                    <li><span className="text-rose-400 font-semibold">SHORT BIAS</span> — преобладание продавцов.</li>
                    <li><span className="text-cyan-300 font-semibold">NEUTRAL</span> — силы примерно равны (48–52%), сигнал слабый.</li>
                </ul>
                <p className="mt-2">
                    Confidence: <span className="text-emerald-300">HIGH</span> ≥ 75%,{" "}
                    <span className="text-amber-300">MEDIUM</span> ≥ 62%,{" "}
                    <span className="text-white/50">LOW</span> ниже 62%.
                </p>
                <p className="mt-2">
                    Бейджи факторов под боксами — что именно толкает сигнал: зелёные ↑ работают в
                    пользу роста, красные ↓ против.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Reversal Candidates (нижняя часть)
                </h4>
                <p className="mt-2">
                    Появляются только когда движок находит swing-кандидата у зоны поддержки или
                    сопротивления. Когда кандидатов нет — эта секция скрыта. Это нормально.
                </p>
                <p className="mt-3 text-xs text-white/50">
                    Это не финансовый совет. Используйте как контекст для собственного анализа.
                </p>
            </InfoDialog>
        </>
    );
}
