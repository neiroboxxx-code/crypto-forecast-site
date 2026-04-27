"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getReversal, type ReversalData, type ReversalScores } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";

// ── Cron schedule math ────────────────────────────────────────────────────

function nextUtcHour(hours: number[]): Date {
    const now = new Date();
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    const utcS = now.getUTCSeconds();
    const candidates = hours.map((h) => {
        const totalMinNow = utcH * 60 + utcM;
        const totalMinTarget = h * 60;
        let diffMin = totalMinTarget - totalMinNow;
        if (diffMin < 0 || (diffMin === 0 && utcS > 0)) diffMin += 24 * 60;
        return diffMin * 60 - (diffMin === 0 ? 0 : utcS);
    });
    const minSec = Math.min(...candidates);
    return new Date(Date.now() + minSec * 1000);
}

function nextUtcTime(h: number, m: number): Date {
    const now = new Date();
    const utcH = now.getUTCHours();
    const utcM = now.getUTCMinutes();
    const utcS = now.getUTCSeconds();
    const nowSec = utcH * 3600 + utcM * 60 + utcS;
    const targetSec = h * 3600 + m * 60;
    let diffSec = targetSec - nowSec;
    if (diffSec <= 0) diffSec += 86400;
    return new Date(Date.now() + diffSec * 1000);
}

function nextSundayUtc(h: number, m: number): Date {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun
    let daysUntilSunday = (7 - dayOfWeek) % 7;
    const targetSec = h * 3600 + m * 60;
    const nowSec = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
    if (daysUntilSunday === 0 && nowSec >= targetSec) daysUntilSunday = 7;
    const diffSec = daysUntilSunday * 86400 + (targetSec - nowSec);
    return new Date(Date.now() + diffSec * 1000);
}

function formatCountdown(target: Date, now: number): string {
    const diff = Math.max(0, Math.floor((target.getTime() - now) / 1000));
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (d > 0) return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatAgo(isoTs: string): string {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(isoTs).getTime()) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return `${h}h ${m}m ago`;
}

// ── Score component definitions ───────────────────────────────────────────

const SCORE_DEFS: { key: keyof ReversalScores; label: string; hint: string }[] = [
    { key: "context_score", label: "context", hint: "bias + market_mode 4H/1D" },
    { key: "zone_score", label: "zone", hint: "nearest support / resistance" },
    { key: "feature_score", label: "feature", hint: "rejections · failures · momentum" },
    { key: "structure_score", label: "structure", hint: "structure_state 4H/1D" },
    { key: "confirmation_score", label: "confirmation", hint: "signal convergence + RSI div" },
];

// ── Sub-components ────────────────────────────────────────────────────────

function PulseDot({ color = "emerald" }: { color?: "emerald" | "cyan" | "amber" }) {
    const c =
        color === "cyan" ? "bg-cyan-400" : color === "amber" ? "bg-amber-400" : "bg-emerald-400";
    const r =
        color === "cyan" ? "ring-cyan-400/30" : color === "amber" ? "ring-amber-400/30" : "ring-emerald-400/30";
    return (
        <span className="relative inline-flex h-2 w-2 shrink-0">
            <span className={`absolute inset-0 animate-ping rounded-full ring-1 ${c}/40 ${r}`} />
            <span className={`relative inline-block h-2 w-2 rounded-full ${c}`} />
        </span>
    );
}

function MonoValue({ children, dim = false }: { children: React.ReactNode; dim?: boolean }) {
    return (
        <span className={`font-mono tabular-nums ${dim ? "text-white/40" : "text-white/90"}`}>
            {children}
        </span>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">
            {children}
        </span>
    );
}

function ScoreBar({
    label, hint, value, max = 2.0,
}: {
    label: string; hint: string; value: number | null; max?: number;
}) {
    const pct = value !== null ? Math.min(100, (value / max) * 100) : 0;
    const unknown = value === null;
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-white/80">{label}</span>
                    <span className="ml-2 text-[10px] text-white/35">{hint}</span>
                </div>
                <MonoValue dim={unknown}>
                    {unknown ? "—" : value!.toFixed(1)}
                    <span className="text-[9px] text-white/25">/{max.toFixed(1)}</span>
                </MonoValue>
            </div>
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400/70 to-emerald-400/30 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ── Architecture constants (static, no fake data) ─────────────────────────

const DATA_FLOW = [
    { id: "bybit", label: "Bybit API", sub: "REST · klines · 4H/1D", color: "amber" },
    { id: "rss", label: "RSS feeds", sub: "fxstreet · rbc · reuters", color: "amber" },
    { id: "vps", label: "VPS · FastAPI", sub: "uvicorn · port 8000 · systemd", color: "cyan" },
    { id: "db", label: "SQLite", sub: "trading_system.db · WAL", color: "cyan" },
    { id: "git", label: "GitHub repo", sub: "site/data/*.json · auto-push", color: "indigo" },
    { id: "vercel", label: "Vercel CDN", sub: "Next.js 15 · ISR", color: "indigo" },
] as const;

const REVERSAL_STAGES = [
    { id: "r1", label: "validate", hint: "InputPayload schema" },
    { id: "r2", label: "preprocess", hint: "4H + 1D candles" },
    { id: "r3", label: "structure", hint: "swing pivots" },
    { id: "r4", label: "zones", hint: "candle anatomy" },
    { id: "r5", label: "features", hint: "ATR · RSI · momentum" },
    { id: "r6", label: "context", hint: "bias + market_mode" },
    { id: "r7", label: "detect", hint: "reversal candidates" },
    { id: "r8", label: "score", hint: "5-component scorer" },
    { id: "r9", label: "diagnostics", hint: "counters + warnings" },
] as const;

const HONEST_LIMITS = [
    {
        id: "bos",
        title: "BOS / CHoCH — not_implemented",
        body: "Институциональная разметка пробоев структуры в v1 намеренно не реализована. Используется консервативный structure_state по свингам.",
    },
    {
        id: "rsi",
        title: "RSI divergence — implemented_v1",
        body: "Только по двум последним пивотам high/low. Более сложные формы пока не детектируются.",
    },
    {
        id: "insufficient",
        title: "insufficient_data — это фича",
        body: "При нехватке баров движок не гадает, а возвращает insufficient_data и пустых кандидатов. Меньше шума.",
    },
    {
        id: "score",
        title: "total_score ≠ вероятность успеха",
        body: "total_score — сила набора фактов (weak/medium/strong). Probability: sigmoid(total, center=5.0, scale=1.2). Не калиброванная доходность.",
    },
] as const;

// ── Main view ─────────────────────────────────────────────────────────────

export function UnderTheHoodView() {
    // ── UTC clock
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const utcStr = new Date(now).toUTCString().slice(17, 25); // HH:MM:SS

    // ── Countdown targets (recalculated every second off "now")
    const fwdTarget = nextUtcHour([0, 4, 8, 12, 16, 20]);
    const digestTarget = nextUtcTime(6, 15);
    const histTarget = nextSundayUtc(1, 0);

    // ── API ping
    const [ping, setPing] = useState<{ ms: number; ok: boolean; ts: number } | null>(null);
    const [pinging, setPinging] = useState(false);
    const pingRef = useRef(false);

    const doPing = useCallback(async () => {
        if (pingRef.current) return;
        pingRef.current = true;
        setPinging(true);
        const t0 = performance.now();
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
            await fetch(`${apiUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
            setPing({ ms: Math.round(performance.now() - t0), ok: true, ts: Date.now() });
        } catch {
            setPing({ ms: -1, ok: false, ts: Date.now() });
        } finally {
            setPinging(false);
            pingRef.current = false;
        }
    }, []);

    useEffect(() => {
        doPing();
        const id = setInterval(doPing, 30_000);
        return () => clearInterval(id);
    }, [doPing]);

    // ── Real reversal data
    const { data: reversal, loading: revLoading } = useApi<ReversalData>(
        getReversal,
        [],
        { intervalMs: 5 * 60_000 },
    );

    const candidate = reversal?.candidates?.[0] ?? null;
    const scores: ReversalScores | null = candidate?.scores ?? null;
    const ctx = reversal?.market_context ?? null;
    const engineAt = reversal?.meta?.engine_output_at ?? null;

    const classColor =
        candidate?.classification === "high"
            ? "text-emerald-300"
            : candidate?.classification === "medium"
              ? "text-cyan-300"
              : candidate?.classification === "low"
                ? "text-amber-300"
                : "text-white/45";

    return (
        <div className="flex flex-col gap-3">

            {/* ══ ENGINE ROOM ══════════════════════════════════════════════ */}
            <div className="rounded-2xl border border-white/8 bg-[#080A0F] p-0 overflow-hidden">

                {/* Header bar */}
                <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        <PulseDot color="emerald" />
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                            engine room · live
                        </span>
                    </div>
                    <MonoValue>
                        <span className="text-[11px] text-white/50">UTC {utcStr}</span>
                    </MonoValue>
                </div>

                {/* Three panels */}
                <div className="grid grid-cols-1 divide-y divide-white/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">

                    {/* Panel 1 — API status */}
                    <div className="flex flex-col gap-3 p-4">
                        <Label>VPS API</Label>
                        <div className="flex items-center gap-2">
                            {pinging ? (
                                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400/60" />
                            ) : ping?.ok ? (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                            ) : (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                            )}
                            <span className="text-[13px] font-semibold text-white/85">
                                {ping === null ? "—" : ping.ok ? "online" : "offline"}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-baseline justify-between">
                                <Label>latency</Label>
                                <MonoValue>
                                    <span className="text-[14px]">
                                        {ping === null ? "—" : ping.ok ? `${ping.ms}ms` : "err"}
                                    </span>
                                </MonoValue>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <Label>last ping</Label>
                                <MonoValue dim>
                                    <span className="text-[11px]">
                                        {ping === null ? "—" : formatAgo(new Date(ping.ts).toISOString())}
                                    </span>
                                </MonoValue>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <Label>service</Label>
                                <MonoValue dim>
                                    <span className="text-[10px]">uvicorn · port 8000</span>
                                </MonoValue>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <Label>restart policy</Label>
                                <MonoValue dim>
                                    <span className="text-[10px]">always · 10s</span>
                                </MonoValue>
                            </div>
                        </div>
                    </div>

                    {/* Panel 2 — Countdown timers */}
                    <div className="flex flex-col gap-3 p-4">
                        <Label>next scheduled runs</Label>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: "forward reversal", target: fwdTarget, color: "emerald" as const },
                                { label: "llm digest", target: digestTarget, color: "cyan" as const },
                                { label: "historical mode", target: histTarget, color: "amber" as const },
                            ].map(({ label, target, color }) => {
                                const textColor =
                                    color === "cyan"
                                        ? "text-cyan-300"
                                        : color === "amber"
                                          ? "text-amber-300"
                                          : "text-emerald-300";
                                return (
                                    <div
                                        key={label}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/30 px-3 py-2"
                                    >
                                        <Label>{label}</Label>
                                        <span className={`font-mono text-[13px] font-semibold tabular-nums ${textColor}`}>
                                            {formatCountdown(target, now)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-auto text-[10px] leading-relaxed text-white/30">
                            forward: <code>0 */4 * * *</code> UTC
                            <br />
                            digest: <code>15 6 * * *</code> UTC
                            <br />
                            historical: <code>0 1 * * 0</code> UTC
                        </div>
                    </div>

                    {/* Panel 3 — Last engine output */}
                    <div className="flex flex-col gap-3 p-4">
                        <div className="flex items-center justify-between">
                            <Label>last engine output</Label>
                            {revLoading && (
                                <span className="text-[9px] uppercase tracking-wider text-white/30 animate-pulse">
                                    loading…
                                </span>
                            )}
                        </div>

                        {engineAt && (
                            <div className="flex items-baseline justify-between">
                                <Label>computed</Label>
                                <MonoValue dim>
                                    <span className="text-[11px]">{formatAgo(engineAt)}</span>
                                </MonoValue>
                            </div>
                        )}

                        {ctx && (
                            <div className="flex flex-col gap-1.5">
                                {[
                                    ["bias_4h", ctx.bias_4h],
                                    ["bias_1d", ctx.bias_1d],
                                    ["mode_4h", ctx.market_mode_4h],
                                    ["price", ctx.current_price_4h?.toLocaleString("en-US", { minimumFractionDigits: 0 })],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-baseline justify-between gap-2">
                                        <Label>{k}</Label>
                                        <MonoValue>
                                            <span className="text-[11px]">{v ?? "—"}</span>
                                        </MonoValue>
                                    </div>
                                ))}
                            </div>
                        )}

                        {candidate ? (
                            <div className="mt-auto flex flex-col gap-1 rounded-lg border border-white/8 bg-black/30 px-3 py-2">
                                <div className="flex items-center justify-between">
                                    <Label>candidate</Label>
                                    <span className={`text-[11px] font-semibold ${classColor}`}>
                                        {candidate.classification}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>direction</Label>
                                    <MonoValue>
                                        <span className="text-[11px]">{candidate.direction}</span>
                                    </MonoValue>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>total_score</Label>
                                    <MonoValue>
                                        <span className="text-[13px] font-semibold">
                                            {scores?.total_score?.toFixed(2) ?? "—"}
                                        </span>
                                        <span className="text-[9px] text-white/25"> / 10.0</span>
                                    </MonoValue>
                                </div>
                            </div>
                        ) : (
                            !revLoading && (
                                <div className="mt-auto rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-[11px] text-white/30">
                                    no active candidate
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Score bars — real values from API */}
                <div className="border-t border-white/8 px-4 py-3">
                    <div className="mb-3 flex items-center justify-between">
                        <Label>scoring components · reversal_engine / scorer.py</Label>
                        <span className="text-[9px] text-white/25">each 0..2.0 · total 0..10.0</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {SCORE_DEFS.map((def) => (
                            <ScoreBar
                                key={def.key}
                                label={def.label}
                                hint={def.hint}
                                value={scores ? (scores[def.key] as number) : null}
                            />
                        ))}
                    </div>
                    {!revLoading && !scores && (
                        <p className="mt-2 text-[10px] text-white/30">
                            нет активного кандидата — движок отработал, кандидатов не обнаружено
                        </p>
                    )}
                </div>

                {/* Bottom metadata bar */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/8 bg-black/30 px-4 py-2">
                    {[
                        ["engine", "reversal_engine_input_v1 → engine_output_v1"],
                        ["scorer", "weak < 5.0 · medium 5.0–7.4 · strong ≥ 7.5"],
                        ["probability", "sigmoid(total, center=5.0, scale=1.2)"],
                    ].map(([k, v]) => (
                        <span key={k} className="text-[10px] text-white/30">
                            <span className="text-white/20">{k}: </span>
                            <code className="text-white/45">{v}</code>
                        </span>
                    ))}
                </div>
            </div>

            {/* ══ Intro ════════════════════════════════════════════════════ */}
            <Card title="Under the Hood" subtitle="Реальная архитектура платформы." padded>
                <p className="max-w-3xl text-[12px] leading-relaxed text-white/60">
                    Два детерминированных движка на правилах и компонентном скоринге. LLM — только для
                    генерации текста дайджеста. Всё остальное: Python, SQLite, FastAPI, cron.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                        ["rule-based · deterministic", "muted"],
                        ["Python · FastAPI · SQLite", "muted"],
                        ["LLM → только дайджест", "accent"],
                        ["не нейросеть", "danger"],
                        ["5-компонентный скоринг", "emerald"],
                    ].map(([label, tone]) => (
                        <TagChip key={label} tone={tone as "muted" | "accent" | "danger" | "emerald"}>{label}</TagChip>
                    ))}
                </div>
            </Card>

            {/* ══ Data flow ════════════════════════════════════════════════ */}
            <Card title="Data flow" subtitle="От источника до браузера." padded>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    {DATA_FLOW.map((node, i) => (
                        <div key={node.id} className="flex items-center gap-2 sm:contents">
                            <div className={`flex-1 rounded-xl border p-3 sm:flex-none sm:min-w-[110px] ${
                                node.color === "amber" ? "border-amber-400/20 bg-amber-400/[0.05]" :
                                node.color === "cyan" ? "border-cyan-400/20 bg-cyan-400/[0.05]" :
                                "border-indigo-400/20 bg-indigo-400/[0.05]"
                            }`}>
                                <div className="text-[12px] font-semibold text-white">{node.label}</div>
                                <div className="mt-0.5 text-[10px] leading-snug text-white/45">{node.sub}</div>
                            </div>
                            {i < DATA_FLOW.length - 1 && (
                                <span className="shrink-0 text-white/20 sm:px-1">→</span>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* ══ Engine cards ═════════════════════════════════════════════ */}
            <section className="grid gap-3 xl:grid-cols-2">
                <EngineCard
                    name="Reversal Engine v1"
                    repo="btc_reversal_project / reversal_engine"
                    tagline="BTCUSDT · 4H + 1D · forward / historical"
                    version="reversal_engine_input_v1 → engine_output_v1"
                    bullets={[
                        "9-этапный пайплайн (validate → diagnostics)",
                        "Два режима: forward (каждые 4H) / historical (еженедельно)",
                        "Immutable frozen-dataclass: ForwardContext / HistoricalContext",
                        "5-компонентный скоринг: total 0..10, порог medium = 5.0",
                        "Probability = sigmoid(total, center=5.0, scale=1.2)",
                        "FastAPI: /health · /reversal · /micro",
                    ]}
                    accent="emerald"
                />
                <EngineCard
                    name="Market Engine"
                    repo="crypto-trading-platform / system"
                    tagline="24H · BTCUSDT · Bybit + RSS news"
                    version="baseline_v11_direction_action_split"
                    bullets={[
                        "Данные: collectors/bybit_data.py + real_news_collector.py",
                        "Фичи: price_action, levels, news_features, trade_plan",
                        "Предиктор: rule-based (models/predictor.py)",
                        "prediction_direction ≠ trade_action — намеренно разделены",
                        "Проверка: result_checker на исторических предсказаниях",
                        "Выход: build_site_export.py → site/data/*.json → GitHub push",
                    ]}
                    accent="cyan"
                />
            </section>

            {/* ══ Pipeline ═════════════════════════════════════════════════ */}
            <Card title="Reversal Engine · пайплайн" subtitle="9 этапов из reversal_engine/main.py. Порядок фиксирован." padded>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                    {REVERSAL_STAGES.map((s, i) => (
                        <div
                            key={s.id}
                            className="relative rounded-xl border border-white/8 border-t-emerald-400/30 bg-[#0A0C10]/90 px-2 py-3 text-center shadow-[inset_0_1px_0_0_rgba(52,211,153,0.07)]"
                        >
                            <div className="font-mono text-[9px] tabular-nums text-emerald-500/40">
                                {String(i + 1).padStart(2, "0")}
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-white/88">{s.label}</div>
                            <div className="mt-0.5 text-[9px] leading-snug text-white/38">{s.hint}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/8 bg-[#0B0D12]/60 px-3 py-2.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">upstream (1–6)</span>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">Один раз → _SharedUpstream</p>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-[#0B0D12]/60 px-3 py-2.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">downstream (7–9)</span>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">Изолированные контексты per-mode, deep-copy мутабельных полей</p>
                    </div>
                </div>
            </Card>

            {/* ══ Scoring + Honest limits ═══════════════════════════════════ */}
            <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr] xl:items-start">
                <Card title="Reversal scoring" subtitle="5 компонентов, каждый 0..2.0, итого 0..10.0." padded>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <ThresholdBadge label="weak" range="< 5.0" tone="muted" />
                        <ThresholdBadge label="medium" range="5.0 – 7.4" tone="accent" />
                        <ThresholdBadge label="strong" range="≥ 7.5" tone="success" />
                        <ThresholdBadge label="probability" range="sigmoid(total, c=5.0, k=1.2)" tone="indigo" />
                    </div>
                    <div className="flex flex-col gap-2">
                        {[
                            { label: "context", mod: "score_context_component()", desc: "bias/market_mode 4H + 1D согласование с направлением" },
                            { label: "zone", mod: "score_zone_component()", desc: "локация относительно ближайших уровней S/R" },
                            { label: "feature", mod: "score_feature_component()", desc: "отторжения, ложные пробои, momentum_slowdown" },
                            { label: "structure", mod: "score_structure_component()", desc: "structure_state 4H/1D согласованность" },
                            { label: "confirmation", mod: "score_confirmation_component()", desc: "сходимость сигналов + RSI divergence bonus" },
                        ].map((c) => (
                            <div key={c.label} className="rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="text-[12px] font-semibold text-white">{c.label}</div>
                                        <div className="mt-0.5 text-[10px] leading-snug text-white/50">{c.desc}</div>
                                    </div>
                                    <span className="shrink-0 text-[11px] font-semibold text-emerald-300">0..2.0</span>
                                </div>
                                <code className="mt-1.5 block text-[10px] text-white/30">{c.mod}</code>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Честные ограничения" subtitle="Что движок явно не делает." padded>
                    <div className="flex flex-col gap-2">
                        {HONEST_LIMITS.map((h) => (
                            <div key={h.id} className="rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3">
                                <div className="text-[12px] font-semibold text-white">{h.title}</div>
                                <div className="mt-1 text-[11px] leading-relaxed text-white/55">{h.body}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
                        <Label>historical params</Label>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {[
                                ["min_wick_ratio", "≥ 0.35"],
                                ["min_excursion_pct", "≥ 2.0%"],
                                ["lookahead_bars", "24 × 4H"],
                                ["min_separation", "8 × 4H"],
                            ].map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-black/20 px-2 py-1.5">
                                    <code className="text-[10px] text-white/40">{k}</code>
                                    <span className="text-[11px] font-semibold text-amber-200/80">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* ══ Decision logic ═══════════════════════════════════════════ */}
            <Card title="Decision logic" subtitle="prediction_direction ≠ trade_action. Намеренно разделены." padded>
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
                        <Label>prediction_direction</Label>
                        <div className="mt-1 text-[20px] font-semibold text-cyan-200">up / down</div>
                        <div className="mt-1 text-[11px] text-white/50">Куда движется рынок по модели</div>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center">
                        <Label>фильтры</Label>
                        <div className="text-[11px] text-white/40">volatility · session</div>
                        <div className="text-[11px] text-white/40">news · structure</div>
                        <div className="mt-1 text-lg text-white/30">→</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-[#0B0D12]/70 p-4">
                        <Label>trade_action</Label>
                        <div className="mt-1 text-[20px] font-semibold text-white/65">no_trade / enter</div>
                        <div className="mt-1 text-[11px] text-white/50">Что делает стратегия в итоге</div>
                    </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3 text-[12px] leading-relaxed text-white/65">
                    Даже если прогноз <code className="rounded bg-white/5 px-1 text-[11px] text-cyan-200">up</code>,
                    стратегия вернёт <code className="rounded bg-white/5 px-1 text-[11px] text-white/80">no_trade</code> при
                    плохих условиях входа. Это защита, а не ошибка.
                </div>
            </Card>

        </div>
    );
}

/* ─────────────────────────── shared sub-components ─────────────────────── */

function TagChip({ children, tone }: { children: React.ReactNode; tone: "muted" | "accent" | "danger" | "emerald" }) {
    const s =
        tone === "accent" ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200/90" :
        tone === "emerald" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200/90" :
        tone === "danger" ? "border-rose-400/25 bg-rose-400/10 text-rose-200/90" :
        "border-white/10 bg-white/5 text-white/60";
    return <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s}`}>{children}</span>;
}

function EngineCard({ name, repo, tagline, version, bullets, accent }: {
    name: string; repo: string; tagline: string; version: string; bullets: string[]; accent: "cyan" | "emerald";
}) {
    const bar = accent === "cyan" ? "before:bg-cyan-400/40" : "before:bg-emerald-400/35";
    const text = accent === "cyan" ? "text-cyan-200/80" : "text-emerald-200/80";
    const dot = accent === "cyan" ? "bg-cyan-400/70" : "bg-emerald-400/70";
    return (
        <article className={`relative overflow-hidden rounded-2xl border border-white/8 bg-[#0E1117]/80 p-5 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:content-[''] ${bar}`}>
            <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h3 className="text-[14px] font-semibold text-white">{name}</h3>
                    <div className="mt-0.5 text-[11px] text-white/40">{repo}</div>
                </div>
                <div className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${text}`}>{tagline}</div>
            </header>
            <ul className="mt-4 flex flex-col gap-1.5 text-[12px] text-white/70">
                {bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                        <span className="leading-relaxed">{b}</span>
                    </li>
                ))}
            </ul>
            <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3 text-[11px]">
                <span className="font-semibold uppercase tracking-[0.14em] text-white/35">contract</span>
                <code className="truncate rounded bg-white/5 px-1.5 py-[2px] text-white/80">{version}</code>
            </footer>
        </article>
    );
}

function ThresholdBadge({ label, range, tone }: { label: string; range: string; tone: "muted" | "accent" | "success" | "indigo" }) {
    const s =
        tone === "accent" ? "border-cyan-400/25 bg-cyan-400/10" :
        tone === "success" ? "border-emerald-400/25 bg-emerald-400/10" :
        tone === "indigo" ? "border-indigo-400/25 bg-indigo-400/10" :
        "border-white/10 bg-white/5";
    const t =
        tone === "accent" ? "text-cyan-200" :
        tone === "success" ? "text-emerald-200" :
        tone === "indigo" ? "text-indigo-200" :
        "text-white/60";
    return (
        <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${s}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
            <span className={`text-[11px] font-semibold tabular-nums ${t}`}>{range}</span>
        </div>
    );
}
