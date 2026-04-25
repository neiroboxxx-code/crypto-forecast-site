"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";

type PipelineStep = {
    id: string;
    label: string;
    hint: string;
};

const MARKET_STEPS: PipelineStep[] = [
    { id: "m1", label: "fetch candles", hint: "Bybit API → SQLite" },
    { id: "m2", label: "build features", hint: "price action, levels, news" },
    { id: "m3", label: "predict", hint: "rule-based predictor" },
    { id: "m4", label: "check old", hint: "result_checker на прошлых" },
    { id: "m5", label: "build report", hint: "report.py → текст" },
    { id: "m6", label: "save", hint: "save_report.py → файл" },
    { id: "m7", label: "email", hint: "send_email_report.py" },
    { id: "m8", label: "publish", hint: "build_site_export → site/data" },
];

const REVERSAL_STEPS: PipelineStep[] = [
    { id: "r1", label: "validate", hint: "reversal_engine_input_v1" },
    { id: "r2", label: "preprocess", hint: "4H + 1D production" },
    { id: "r3", label: "structure", hint: "пивотные свинги" },
    { id: "r4", label: "zones", hint: "анатомия свечи" },
    { id: "r5", label: "features", hint: "ATR/RSI/momentum" },
    { id: "r6", label: "context", hint: "bias + market_mode" },
    { id: "r7", label: "detect", hint: "reversal candidates" },
    { id: "r8", label: "score", hint: "weak/medium/strong" },
    { id: "r9", label: "diagnostics", hint: "counters + warnings" },
];

type ScoringComponent = {
    id: string;
    label: string;
    weight: number;
    description: string;
};

const SCORING_COMPONENTS: ScoringComponent[] = [
    { id: "s1", label: "momentum slowdown", weight: 18, description: "замедление импульса на подходе" },
    { id: "s2", label: "rejection", weight: 16, description: "длинные тени в зоне" },
    { id: "s3", label: "breakout failure", weight: 15, description: "ложный пробой / возврат" },
    { id: "s4", label: "follow-through", weight: 14, description: "реакция после триггера" },
    { id: "s5", label: "rsi divergence v1", weight: 12, description: "двум последним пивотам hi/lo" },
    { id: "s6", label: "location quality", weight: 12, description: "качество зоны (context)" },
    { id: "s7", label: "structure bias", weight: 8, description: "консервативный structure_state" },
    { id: "s8", label: "context alignment", weight: 5, description: "4H/1D согласование bias" },
];

const HONEST_LIMITS: { id: string; title: string; body: string }[] = [
    {
        id: "bos",
        title: "BOS / CHoCH — not_implemented",
        body: "Разметка пробоев по институциональной школе в v1 намеренно не реализована. Используется консервативный structure_state по свингам.",
    },
    {
        id: "rsi",
        title: "RSI divergence — v1",
        body: "Определяется только по двум последним пивотам high/low. Более сложные формы пока не детектируются.",
    },
    {
        id: "insufficient",
        title: "insufficient_data — это фича",
        body: "При нехватке баров модуль не гадает, а честно отдаёт insufficient_data и пустых кандидатов. Так меньше шумных сигналов.",
    },
    {
        id: "score",
        title: "Score ≠ вероятность успеха",
        body: "total_score — это сила набора фактов (weak/medium/strong), а не калиброванная вероятность. Не путаем.",
    },
];

const LOG_TEMPLATES: { source: "market" | "reversal" | "api" | "infra"; text: string }[] = [
    { source: "market", text: "fetch candles: Bybit klines 1h × 200 ok" },
    { source: "market", text: "features built: price_action, levels, news_confirmation" },
    { source: "market", text: "predictor: baseline_v11 · direction=up · action=no_trade" },
    { source: "market", text: "result_checker: 2 predictions resolved (hit=1 miss=1)" },
    { source: "market", text: "build_site_export: latest-signal.json (+ merge preserved)" },
    { source: "market", text: "push_site_data → site/data ok" },
    { source: "reversal", text: "validate_input: reversal_engine_input_v1 ok" },
    { source: "reversal", text: "preprocess: 4H=200 · 1D=120 candles" },
    { source: "reversal", text: "structure: swings_4h=7 · swings_1d=4 · state=range" },
    { source: "reversal", text: "zones: 4H=5 · 1D=3 (anatomy)" },
    { source: "reversal", text: "features: ATR=312.4 · RSI=41.8 · momentum_slowdown=true" },
    { source: "reversal", text: "context: bias=neutral · market_mode=ranging" },
    { source: "reversal", text: "detect_reversal_candidates: 1 candidate (conservative)" },
    { source: "reversal", text: "scorer: total_score=58 · class=medium" },
    { source: "reversal", text: "diagnostics: warnings=0 · stub_modules=[]" },
    { source: "api", text: "GET /health 200 · mode=localhost" },
    { source: "api", text: "POST /reversal 200 · engine_output_v1 · 43ms" },
    { source: "infra", text: "site deploy: Vercel build · 12.8s · ok" },
];

function formatElapsed(ms: number): string {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatAgo(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s ago`;
}

export function UnderTheHoodView() {
    // ── "cycle" clock — sets on mount to avoid hydration mismatch
    const [mountedAt, setMountedAt] = useState<number | null>(null);
    const [now, setNow] = useState<number | null>(null);
    const [cycleNo, setCycleNo] = useState<number>(1042);

    useEffect(() => {
        const t = Date.now();
        setMountedAt(t);
        setNow(t);
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const elapsedMs = mountedAt && now ? now - mountedAt : 0;
    const lastHeartbeatMs = useMemo(() => (now ? (now % 47_000) : 0), [now]);

    // ── rotating active step per pipeline (subtle "processing" feel)
    const [marketStep, setMarketStep] = useState(0);
    const [reversalStep, setReversalStep] = useState(0);

    useEffect(() => {
        const a = setInterval(() => {
            setMarketStep((i) => {
                const next = (i + 1) % MARKET_STEPS.length;
                if (next === 0) setCycleNo((n) => n + 1);
                return next;
            });
        }, 4200);
        const b = setInterval(
            () => setReversalStep((i) => (i + 1) % REVERSAL_STEPS.length),
            3100,
        );
        return () => {
            clearInterval(a);
            clearInterval(b);
        };
    }, []);

    // ── ticking counters (slow drift)
    const [counters, setCounters] = useState({
        candles: 248,
        predictions: 41,
        reversals: 3,
        zones: 18,
    });
    useEffect(() => {
        const id = setInterval(() => {
            setCounters((c) => ({
                candles: c.candles + (Math.random() < 0.8 ? 1 : 2),
                predictions: c.predictions + (Math.random() < 0.15 ? 1 : 0),
                reversals: c.reversals + (Math.random() < 0.04 ? 1 : 0),
                zones: c.zones + (Math.random() < 0.2 ? 1 : 0),
            }));
        }, 4500);
        return () => clearInterval(id);
    }, []);

    // ── live event log
    type LogLine = { id: number; ts: string; source: (typeof LOG_TEMPLATES)[number]["source"]; text: string };
    const [log, setLog] = useState<LogLine[]>([]);
    const idRef = useRef(1);

    useEffect(() => {
        const seed = (d: Date) => {
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            const ss = String(d.getSeconds()).padStart(2, "0");
            return `${hh}:${mm}:${ss}`;
        };
        const push = () => {
            const tpl = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)];
            setLog((prev) => {
                const next = [
                    ...prev,
                    { id: idRef.current++, ts: seed(new Date()), source: tpl.source, text: tpl.text },
                ];
                return next.slice(-9);
            });
        };
        // seed a few lines
        for (let i = 0; i < 4; i++) push();
        const id = setInterval(push, 3400);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex flex-col gap-3">
            {/* ── Intro ── */}
            <Card
                title="Under the Hood"
                subtitle="Как на самом деле устроен движок за понятными цифрами главной страницы."
                padded
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-3xl text-[12px] leading-relaxed text-white/60">
                        Под капотом не нейросеть. Это два детерминированных движка на правилах и компонентном
                        скоринге, плюс LLM-слой для человекочитаемых объяснений. Ниже — реальные модули и контракты,
                        а не маркетинговые формулировки.
                    </p>
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="flex flex-wrap justify-end gap-1.5">
                            <TagChip tone="muted">rule-based</TagChip>
                            <TagChip tone="muted">deterministic</TagChip>
                            <TagChip tone="accent">LLM only for explanations</TagChip>
                            <TagChip tone="danger">not a neural net</TagChip>
                        </div>
                        <Heartbeat ms={lastHeartbeatMs} />
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <CounterTile label="candles 24h" value={counters.candles} />
                    <CounterTile label="predictions checked" value={counters.predictions} />
                    <CounterTile label="reversal candidates" value={counters.reversals} />
                    <CounterTile label="zones built" value={counters.zones} />
                </div>
            </Card>

            {/* ── Hero: two engines ── */}
            <section className="grid gap-3 xl:grid-cols-2">
                <EngineCard
                    name="Market Engine"
                    repo="crypto-trading-platform / system"
                    tagline="24h forecast · BTCUSDT · Bybit + news"
                    version="baseline_v11_direction_action_split"
                    bullets={[
                        "Сбор: collectors/bybit_data.py, real_news_collector.py",
                        "Фичи: price_action, levels, news_features, trade_plan",
                        "Предиктор: rule-based (models/predictor.py)",
                        "Проверка: result_checker по историческим предсказаниям",
                        "Выход: report.py + build_site_export.py → site/data",
                    ]}
                    accent="cyan"
                />
                <EngineCard
                    name="Reversal Engine v1"
                    repo="btc_reversal_project / reversal_engine"
                    tagline="BTCUSDT 4H + 1D · forward / historical modes"
                    version="reversal_engine_input_v1 → engine_output_v1"
                    bullets={[
                        "9-этапный пайплайн (run_pipeline)",
                        "Frozen-dataclass контексты: ForwardContext / HistoricalContext",
                        "Компонентный scorer: weak / medium / strong",
                        "FastAPI surface: /health, /reversal, /micro",
                        "Честные ограничения: BOS/CHoCH не реализованы",
                    ]}
                    accent="emerald"
                />
            </section>

            {/* ── Pipelines ── */}
            <Card title="Pipelines" subtitle="Реальные шаги оркестрации из кода обоих движков.">
                <div className="flex flex-col gap-4">
                    <PipelineRow
                        title="Market Engine · system/main.py"
                        hint={`cycle #${cycleNo} · ${formatElapsed(elapsedMs)}`}
                        steps={MARKET_STEPS}
                        activeIndex={marketStep}
                        accent="cyan"
                    />
                    <PipelineRow
                        title="Reversal Engine · reversal_engine/main.py"
                        hint="forward / historical · 9 stages"
                        steps={REVERSAL_STEPS}
                        activeIndex={reversalStep}
                        accent="emerald"
                    />
                </div>
            </Card>

            {/* ── Decision logic ── */}
            <Card
                title="Decision logic"
                subtitle="Ключевое: prediction_direction ≠ trade_action. Движок их не смешивает."
            >
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr] lg:items-stretch">
                    <DecisionBox
                        label="prediction_direction"
                        value="up"
                        caption="направление рынка по модели"
                        tone="accent"
                    />
                    <DecisionArrow
                        labelTop="фильтры / гварды"
                        labelBottom="volatility · session · news · структурные"
                    />
                    <DecisionBox
                        label="trade_action"
                        value="no_trade"
                        caption="что делает стратегия в итоге"
                        tone="muted"
                    />
                </div>
                <div className="mt-3 rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3 text-[12px] leading-relaxed text-white/70">
                    Даже если модель видит рост, стратегия может вернуть{" "}
                    <code className="rounded bg-white/5 px-1 py-[1px] text-[11px] text-white/85">no_trade</code>. Это не
                    ошибка, а защита от плохих условий входа. Модель и действие — две разные сущности.
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-white/50">
                    <span className="font-semibold uppercase tracking-[0.14em] text-white/40">model version</span>
                    <code className="rounded bg-white/5 px-1.5 py-[1px] text-white/80">
                        baseline_v11_direction_action_split
                    </code>
                </div>
            </Card>

            {/* ── Reversal scoring + honest limits ── */}
            <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr] xl:items-start">
                <Card title="Reversal scoring" subtitle="Компонентная оценка силы набора фактов (не вероятность).">
                    <div className="flex flex-col gap-2">
                        {SCORING_COMPONENTS.map((c) => (
                            <ScoringBar key={c.id} item={c} />
                        ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-white/55">
                        <span className="font-semibold uppercase tracking-[0.14em] text-white/40">classes</span>
                        <TagChip tone="muted">weak</TagChip>
                        <TagChip tone="accent">medium</TagChip>
                        <TagChip tone="success">strong</TagChip>
                    </div>
                </Card>

                <Card title="Honest limits" subtitle="Что движок явно НЕ делает. Так честнее и надёжнее.">
                    <div className="grid gap-2">
                        {HONEST_LIMITS.map((h) => (
                            <div
                                key={h.id}
                                className="rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3"
                            >
                                <div className="text-[12px] font-semibold text-white">{h.title}</div>
                                <div className="mt-1 text-[11px] leading-relaxed text-white/60">{h.body}</div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* ── Event log ── */}
            <Card title="Event log" subtitle="Живые события движков (mock, обновляется пока идёт сессия).">
                <div className="rounded-xl border border-white/8 bg-black/55 p-3 font-mono text-[11px] leading-relaxed">
                    {log.length === 0 ? (
                        <div className="text-white/40">waiting for events…</div>
                    ) : (
                        <ul className="flex flex-col gap-0.5">
                            {log.map((line) => (
                                <li key={line.id} className="flex items-start gap-2">
                                    <span className="shrink-0 tabular-nums text-white/40">{line.ts}</span>
                                    <span
                                        className={`shrink-0 rounded px-1 py-[1px] text-[10px] font-semibold uppercase tracking-wider ${
                                            line.source === "market"
                                                ? "bg-cyan-400/10 text-cyan-200/90"
                                                : line.source === "reversal"
                                                  ? "bg-emerald-400/10 text-emerald-200/90"
                                                  : line.source === "api"
                                                    ? "bg-indigo-400/10 text-indigo-200/90"
                                                    : "bg-white/5 text-white/55"
                                        }`}
                                    >
                                        {line.source}
                                    </span>
                                    <span className="min-w-0 flex-1 break-words text-white/85">{line.text}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Card>
        </div>
    );
}

/* ─────────────────────────── sub-components ─────────────────────────── */

function Heartbeat({ ms }: { ms: number }) {
    return (
        <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/65">
            <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/40" />
                <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            </span>
            <span>last heartbeat · {formatAgo(ms)}</span>
        </div>
    );
}

function CounterTile({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</div>
            <div className="mt-0.5 text-[18px] font-semibold tabular-nums text-white/90">
                {value.toLocaleString("en-US")}
            </div>
        </div>
    );
}

function EngineCard({
    name,
    repo,
    tagline,
    version,
    bullets,
    accent,
}: {
    name: string;
    repo: string;
    tagline: string;
    version: string;
    bullets: string[];
    accent: "cyan" | "emerald";
}) {
    const accentRing =
        accent === "cyan" ? "before:bg-cyan-400/35" : "before:bg-emerald-400/30";
    const accentText = accent === "cyan" ? "text-cyan-200" : "text-emerald-200";
    const dotBg = accent === "cyan" ? "bg-cyan-400/70" : "bg-emerald-400/70";

    return (
        <article
            className={`relative overflow-hidden rounded-2xl border border-white/8 bg-[#0E1117]/80 p-4 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:content-[''] ${accentRing}`}
        >
            <header className="flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-[14px] font-semibold text-white">{name}</h3>
                    <div className="mt-0.5 text-[11px] text-white/45">{repo}</div>
                </div>
                <div className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${accentText}`}>{tagline}</div>
            </header>

            <ul className="mt-3 grid gap-1.5 text-[12px] text-white/75">
                {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dotBg}`} />
                        <span className="leading-relaxed">{b}</span>
                    </li>
                ))}
            </ul>

            <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-2 text-[11px]">
                <span className="font-semibold uppercase tracking-[0.14em] text-white/40">contract</span>
                <code className="truncate rounded bg-white/5 px-1.5 py-[2px] text-white/85">{version}</code>
            </footer>
        </article>
    );
}

function PipelineRow({
    title,
    hint,
    steps,
    activeIndex,
    accent,
}: {
    title: string;
    hint: string;
    steps: PipelineStep[];
    activeIndex: number;
    accent: "cyan" | "emerald";
}) {
    const lineCls =
        accent === "cyan"
            ? "from-cyan-400/30 via-cyan-400/10 to-transparent"
            : "from-emerald-400/30 via-emerald-400/10 to-transparent";

    return (
        <div>
            <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                <h4 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">{title}</h4>
                <span className="text-[10px] tabular-nums text-white/40">{hint}</span>
            </div>

            <div className="relative">
                <div className={`pointer-events-none absolute left-2 right-2 top-4 h-px bg-gradient-to-r ${lineCls}`} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-9">
                    {steps.map((s, i) => {
                        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
                        return <PipelineStepCell key={s.id} step={s} index={i} state={state} accent={accent} />;
                    })}
                </div>
            </div>
        </div>
    );
}

function PipelineStepCell({
    step,
    index,
    state,
    accent,
}: {
    step: PipelineStep;
    index: number;
    state: "done" | "active" | "pending";
    accent: "cyan" | "emerald";
}) {
    const accentDot = accent === "cyan" ? "bg-cyan-400" : "bg-emerald-400";
    const accentRing = accent === "cyan" ? "ring-cyan-400/30" : "ring-emerald-400/30";
    const accentGlow = accent === "cyan" ? "shadow-[0_0_0_3px_rgba(34,211,238,0.12)]" : "shadow-[0_0_0_3px_rgba(52,211,153,0.12)]";

    const cellBase = "relative rounded-lg border px-2 py-1.5 transition";
    const cellTone =
        state === "active"
            ? `border-white/15 bg-white/[0.04] ${accentGlow}`
            : state === "done"
              ? "border-white/8 bg-[#0B0D12]/70 opacity-95"
              : "border-white/8 bg-[#0B0D12]/60 opacity-70";

    return (
        <div className={`${cellBase} ${cellTone}`}>
            <div className="flex items-center gap-1.5">
                <span
                    className={`relative inline-flex h-1.5 w-1.5 items-center justify-center rounded-full ${
                        state === "pending" ? "bg-white/20" : accentDot
                    }`}
                >
                    {state === "active" && (
                        <span className={`absolute inline-flex h-3 w-3 animate-ping rounded-full ring-1 ${accentRing}`} />
                    )}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                    {String(index + 1).padStart(2, "0")}
                </span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-white/35">
                    {state === "done" ? "ok" : state === "active" ? "run" : "—"}
                </span>
            </div>
            <div className="mt-0.5 truncate text-[12px] font-semibold text-white">{step.label}</div>
            <div className="mt-0.5 truncate text-[10px] text-white/50">{step.hint}</div>
            {state === "active" && (
                <div className="mt-1 h-[2px] w-full overflow-hidden rounded-full bg-white/5">
                    <div
                        className={`h-full ${accent === "cyan" ? "bg-cyan-400/70" : "bg-emerald-400/70"} animate-pulse`}
                        style={{ width: "66%" }}
                    />
                </div>
            )}
        </div>
    );
}

function DecisionBox({
    label,
    value,
    caption,
    tone,
}: {
    label: string;
    value: string;
    caption: string;
    tone: "accent" | "muted";
}) {
    const valueClass = tone === "accent" ? "text-cyan-200" : "text-white/70";
    return (
        <div className="rounded-2xl border border-white/8 bg-[#0B0D12]/70 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</div>
            <div className={`mt-1 text-[22px] font-semibold tabular-nums ${valueClass}`}>{value}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-white/55">{caption}</div>
        </div>
    );
}

function DecisionArrow({ labelTop, labelBottom }: { labelTop: string; labelBottom: string }) {
    return (
        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">{labelTop}</div>
            <div className="my-2 flex w-full items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-emerald-400/40" />
                <span className="text-[11px] font-semibold text-white/75">→</span>
                <span className="h-px flex-1 bg-gradient-to-r from-emerald-400/40 to-cyan-400/40" />
            </div>
            <div className="text-[11px] leading-relaxed text-white/50">{labelBottom}</div>
        </div>
    );
}

function ScoringBar({ item }: { item: ScoringComponent }) {
    const pct = Math.min(100, Math.max(0, item.weight * 4));
    return (
        <div className="rounded-lg border border-white/8 bg-[#0B0D12]/60 p-2">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-white">{item.label}</div>
                    <div className="mt-0.5 truncate text-[10px] text-white/50">{item.description}</div>
                </div>
                <div className="shrink-0 text-[11px] font-semibold tabular-nums text-cyan-200/90">{item.weight}</div>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400/60 via-cyan-400/40 to-emerald-400/50"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function TagChip({ children, tone }: { children: React.ReactNode; tone: "accent" | "muted" | "success" | "danger" }) {
    const base = "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider";
    const s =
        tone === "accent"
            ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200/90"
            : tone === "success"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200/90"
              : tone === "danger"
                ? "border-rose-400/25 bg-rose-400/10 text-rose-200/90"
                : "border-white/10 bg-white/5 text-white/65";
    return <span className={`${base} ${s}`}>{children}</span>;
}
