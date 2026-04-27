"use client";

import { Card } from "@/components/ui/card";

// ── Real pipeline stages (from reversal_engine/main.py) ───────────────────

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

// ── Real scoring components (from reversal_engine/scorer.py) ─────────────
// Each component: 0..2.0, total 0..10.0
// weak < 5.0 · medium 5.0–7.4 · strong ≥ 7.5

const SCORE_COMPONENTS = [
    {
        id: "ctx",
        label: "context",
        module: "score_context_component",
        desc: "Согласованность bias + market_mode на 4H и 1D с направлением кандидата",
        max: 2.0,
    },
    {
        id: "zone",
        label: "zone",
        module: "score_zone_component",
        desc: "Локация кандидата относительно ближайших уровней поддержки / сопротивления",
        max: 2.0,
    },
    {
        id: "feat",
        label: "feature",
        module: "score_feature_component",
        desc: "Отторжения цены, ложные пробои, замедление импульса momentum_slowdown_status",
        max: 2.0,
    },
    {
        id: "str",
        label: "structure",
        module: "score_structure_component",
        desc: "Согласованность structure_state_4H / 1D с направлением кандидата",
        max: 2.0,
    },
    {
        id: "cnf",
        label: "confirmation",
        module: "score_confirmation_component",
        desc: "Сходимость сигналов + RSI divergence 4H bonus (реализован как implemented_v1)",
        max: 2.0,
    },
] as const;

// ── Real cron schedule (from /root/vps/crontab.txt) ──────────────────────

const CRON_JOBS = [
    {
        id: "fwd",
        name: "Forward Reversal",
        schedule: "0 */4 * * *",
        human: "каждые 4H",
        what: "Reversal Engine → обновляет сигнал и сохраняет в БД",
        accent: "emerald",
    },
    {
        id: "bot",
        name: "PaperBot tick",
        schedule: "5 */4 * * *",
        human: "каждые 4H + 5m",
        what: "Читает последний сигнал → управляет paper-позицией по правилам",
        accent: "emerald",
    },
    {
        id: "news",
        name: "News collector",
        schedule: "0 4 * * *",
        human: "ежедневно 04:00 UTC",
        what: "RSS (fxstreet, rbc) → SQLite, топики: ETF, macro, regulation, institutional",
        accent: "cyan",
    },
    {
        id: "digest",
        name: "LLM Digest",
        schedule: "15 6 * * *",
        human: "ежедневно 06:15 UTC",
        what: "DeepSeek v3.2 (Yandex Cloud) → latest-digest.json → git push → Vercel",
        accent: "cyan",
    },
    {
        id: "hist",
        name: "Historical mode",
        schedule: "0 1 * * 0",
        human: "воскресенье 01:00 UTC",
        what: "Анализ последних 30 дней: swing pivots + wick ratio + 2% excursion",
        accent: "amber",
    },
] as const;

// ── Data flow nodes ───────────────────────────────────────────────────────

const DATA_FLOW = [
    { id: "bybit", label: "Bybit API", sub: "REST · klines · 4H / 1D", color: "amber" },
    { id: "rss", label: "RSS feeds", sub: "fxstreet · rbc · reuters", color: "amber" },
    { id: "vps", label: "VPS · FastAPI", sub: "uvicorn · port 8000 · systemd", color: "cyan" },
    { id: "db", label: "SQLite", sub: "trading_system.db · WAL", color: "cyan" },
    { id: "git", label: "GitHub repo", sub: "site/data/*.json · auto-push", color: "indigo" },
    { id: "vercel", label: "Vercel CDN", sub: "Next.js 15 · SSG + ISR", color: "indigo" },
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
        body: "Только по двум последним пивотам high/low. Более сложные формы расхождений пока не детектируются.",
    },
    {
        id: "insufficient",
        title: "insufficient_data — это фича",
        body: "При нехватке баров движок не гадает, а возвращает insufficient_data и пустых кандидатов. Меньше шума вместо иллюзии сигнала.",
    },
    {
        id: "score",
        title: "total_score ≠ вероятность успеха",
        body: "total_score — сила набора фактов (weak/medium/strong). Probability — это sigmoid(total, center=5.0, scale=1.2). Не калиброванная доходность.",
    },
] as const;

// ── Component ─────────────────────────────────────────────────────────────

export function UnderTheHoodView() {
    return (
        <div className="flex flex-col gap-3">

            {/* ── Intro ── */}
            <Card title="Under the Hood" subtitle="Реальная инженерная архитектура платформы." padded>
                <p className="max-w-3xl text-[13px] leading-relaxed text-white/65">
                    Под капотом — не нейросеть и не ИИ-маркетинг. Два детерминированных движка на правилах
                    и компонентном скоринге: один анализирует 24h-направление рынка, второй ищет точки разворота
                    на 4H + 1D. LLM используется только для генерации читаемого текста дайджеста.
                    Всё остальное — Python, SQLite, FastAPI, cron.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                        ["rule-based", "muted"],
                        ["deterministic", "muted"],
                        ["Python · FastAPI · SQLite", "muted"],
                        ["LLM → только дайджест", "accent"],
                        ["не нейросеть", "danger"],
                        ["5-компонентный скоринг", "emerald"],
                    ].map(([label, tone]) => (
                        <TagChip key={label} tone={tone as "muted" | "accent" | "danger" | "emerald"}>{label}</TagChip>
                    ))}
                </div>
            </Card>

            {/* ── Data flow ── */}
            <Card title="Data flow" subtitle="Как данные проходят от источника до браузера пользователя." padded>
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
                <div className="mt-3 rounded-xl border border-white/8 bg-black/30 px-4 py-3 text-[11px] leading-relaxed text-white/50">
                    VPS работает под <code className="text-white/80">systemd</code> с{" "}
                    <code className="text-white/80">Restart=always</code> — поднимается автоматически после перезагрузки.
                    Дайджест пишется скриптом прямо в репозиторий сайта и пушится; Vercel
                    подхватывает коммит и пересобирает фронтенд автоматически.
                </div>
            </Card>

            {/* ── Cron schedule ── */}
            <Card title="Расписание автоматики" subtitle="Реальный crontab с VPS. Всё работает без ручного запуска." padded>
                <div className="flex flex-col gap-2">
                    {CRON_JOBS.map((job) => (
                        <div
                            key={job.id}
                            className="grid grid-cols-1 gap-1 rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3 sm:grid-cols-[140px_1fr]"
                        >
                            <div className="flex flex-col gap-0.5">
                                <span className={`inline-flex w-fit rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                    job.accent === "emerald" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200/90" :
                                    job.accent === "cyan" ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200/90" :
                                    "border-amber-400/25 bg-amber-400/10 text-amber-200/90"
                                }`}>{job.human}</span>
                                <code className="mt-1 text-[10px] text-white/35">{job.schedule}</code>
                            </div>
                            <div>
                                <div className="text-[12px] font-semibold text-white/85">{job.name}</div>
                                <div className="mt-0.5 text-[11px] leading-relaxed text-white/50">{job.what}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* ── Two engine cards ── */}
            <section className="grid gap-3 xl:grid-cols-2">
                <EngineCard
                    name="Reversal Engine v1"
                    repo="btc_reversal_project / reversal_engine"
                    tagline="BTCUSDT · 4H + 1D · forward / historical"
                    version="reversal_engine_input_v1 → engine_output_v1"
                    bullets={[
                        "9-этапный пайплайн (validate → diagnostics)",
                        "Два режима: forward (каждые 4H) / historical (еженедельно)",
                        "Immutable frozen-dataclass контексты: ForwardContext / HistoricalContext",
                        "5-компонентный скоринг: total 0..10, порог medium = 5.0",
                        "Probability = sigmoid(total, center=5.0, scale=1.2)",
                        "FastAPI: /health · /reversal · /micro (uvicorn, порт 8000)",
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
                        "Выход: report.py → build_site_export.py → site/data/*.json",
                    ]}
                    accent="cyan"
                />
            </section>

            {/* ── Reversal pipeline ── */}
            <Card
                title="Reversal Engine · пайплайн"
                subtitle="9 этапов из reversal_engine/main.py. Порядок фиксирован, контексты иммутабельны."
                padded
            >
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                    {REVERSAL_STAGES.map((s, i) => (
                        <div
                            key={s.id}
                            className="relative rounded-xl border border-white/8 border-t-emerald-400/30 bg-[#0A0C10]/90 px-2 py-3 text-center shadow-[inset_0_1px_0_0_rgba(52,211,153,0.07)]"
                        >
                            <div className="font-mono text-[9px] tabular-nums text-emerald-500/40">
                                {String(i + 1).padStart(2, "0")}
                            </div>
                            <div className="mt-1 text-[11px] font-semibold text-white/90">{s.label}</div>
                            <div className="mt-0.5 text-[9px] leading-snug text-white/40">{s.hint}</div>
                        </div>
                    ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <InfoPill label="upstream (1–6)" body="Выполняется один раз, материализуется в _SharedUpstream" />
                    <InfoPill label="downstream (7–9)" body="Изолированные контексты per-mode, deep-copy мутабельных полей" />
                </div>
            </Card>

            {/* ── Scoring breakdown ── */}
            <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr] xl:items-start">
                <Card
                    title="Reversal scoring"
                    subtitle="5 компонентов, каждый 0..2.0, итого 0..10.0. Не вероятность — сила факторной базы."
                    padded
                >
                    <div className="mb-3 flex flex-wrap gap-2">
                        <ThresholdBadge label="weak" range="< 5.0" tone="muted" />
                        <ThresholdBadge label="medium" range="5.0 – 7.4" tone="accent" />
                        <ThresholdBadge label="strong" range="≥ 7.5" tone="success" />
                        <ThresholdBadge label="probability" range="sigmoid(total, c=5.0, k=1.2)" tone="indigo" />
                    </div>
                    <div className="flex flex-col gap-2">
                        {SCORE_COMPONENTS.map((c) => (
                            <div
                                key={c.id}
                                className="rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-[12px] font-semibold text-white">{c.label}</div>
                                        <div className="mt-0.5 text-[10px] leading-snug text-white/50">{c.desc}</div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <span className="text-[11px] font-semibold text-emerald-300">0..{c.max}</span>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <code className="text-[10px] text-white/35">{c.module}()</code>
                                    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/5">
                                        <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-400/50 to-emerald-400/20" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* ── Honest limits ── */}
                <Card title="Честные ограничения" subtitle="Что движок явно не делает. Прозрачность важнее маркетинга." padded>
                    <div className="flex flex-col gap-2">
                        {HONEST_LIMITS.map((h) => (
                            <div
                                key={h.id}
                                className="rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3"
                            >
                                <div className="text-[12px] font-semibold text-white">{h.title}</div>
                                <div className="mt-1 text-[11px] leading-relaxed text-white/55">{h.body}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/70">
                            Historical params
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {[
                                ["min_wick_ratio", "≥ 0.35"],
                                ["min_excursion_pct", "≥ 2.0%"],
                                ["lookahead_bars", "24 × 4H"],
                                ["min_separation_bars", "8 × 4H"],
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

            {/* ── Decision logic ── */}
            <Card
                title="Decision logic"
                subtitle="prediction_direction ≠ trade_action. Движок намеренно не смешивает прогноз и решение."
                padded
            >
                <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                            prediction_direction
                        </div>
                        <div className="mt-1 text-[20px] font-semibold text-cyan-200">up / down</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-white/50">
                            Куда движется рынок по модели
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">фильтры</div>
                        <div className="text-[11px] text-white/40">volatility · session</div>
                        <div className="text-[11px] text-white/40">news · structure</div>
                        <div className="mt-1 text-lg text-white/30">→</div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-[#0B0D12]/70 p-4">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                            trade_action
                        </div>
                        <div className="mt-1 text-[20px] font-semibold text-white/65">no_trade / enter</div>
                        <div className="mt-1 text-[11px] leading-relaxed text-white/50">
                            Что делает стратегия в итоге
                        </div>
                    </div>
                </div>
                <div className="mt-3 rounded-xl border border-white/8 bg-[#0B0D12]/70 p-3 text-[12px] leading-relaxed text-white/65">
                    Даже если прогноз{" "}
                    <code className="rounded bg-white/5 px-1 py-[1px] text-[11px] text-cyan-200">up</code>, стратегия
                    вернёт{" "}
                    <code className="rounded bg-white/5 px-1 py-[1px] text-[11px] text-white/80">no_trade</code> при
                    плохих условиях входа. Это защита, а не ошибка. Прогноз и действие — две разные сущности.
                </div>
            </Card>

        </div>
    );
}

/* ─────────────────────────── sub-components ─────────────────────────── */

function TagChip({
    children,
    tone,
}: {
    children: React.ReactNode;
    tone: "muted" | "accent" | "danger" | "emerald";
}) {
    const s =
        tone === "accent"
            ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200/90"
            : tone === "emerald"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200/90"
              : tone === "danger"
                ? "border-rose-400/25 bg-rose-400/10 text-rose-200/90"
                : "border-white/10 bg-white/5 text-white/60";
    return (
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s}`}>
            {children}
        </span>
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
    const bar = accent === "cyan" ? "before:bg-cyan-400/40" : "before:bg-emerald-400/35";
    const text = accent === "cyan" ? "text-cyan-200/80" : "text-emerald-200/80";
    const dot = accent === "cyan" ? "bg-cyan-400/70" : "bg-emerald-400/70";

    return (
        <article
            className={`relative overflow-hidden rounded-2xl border border-white/8 bg-[#0E1117]/80 p-5 before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:content-[''] ${bar}`}
        >
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

function InfoPill({ label, body }: { label: string; body: string }) {
    return (
        <div className="rounded-xl border border-white/8 bg-[#0B0D12]/60 px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</span>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/55">{body}</p>
        </div>
    );
}

function ThresholdBadge({
    label,
    range,
    tone,
}: {
    label: string;
    range: string;
    tone: "muted" | "accent" | "success" | "indigo";
}) {
    const s =
        tone === "accent"
            ? "border-cyan-400/25 bg-cyan-400/10"
            : tone === "success"
              ? "border-emerald-400/25 bg-emerald-400/10"
              : tone === "indigo"
                ? "border-indigo-400/25 bg-indigo-400/10"
                : "border-white/10 bg-white/5";
    const t =
        tone === "accent"
            ? "text-cyan-200"
            : tone === "success"
              ? "text-emerald-200"
              : tone === "indigo"
                ? "text-indigo-200"
                : "text-white/60";
    return (
        <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 ${s}`}>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
            <span className={`text-[11px] font-semibold tabular-nums ${t}`}>{range}</span>
        </div>
    );
}
