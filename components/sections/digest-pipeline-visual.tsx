import type { MarketDigestData } from "@/lib/api";

const SOURCE_META = [
    { key: "bybit",        name: "Bybit",    detail: "BTC · ETH · SOL · ONDO · LINK", tone: "cyan" as const },
    { key: "fred",         name: "FRED",     detail: "S&P 500 · Nasdaq · VIX · Oil",   tone: "amber" as const },
    { key: "newsdata",     name: "NewsData", detail: "BTC / ETH crypto feed",          tone: "emerald" as const },
    { key: "gnews_crypto", name: "GNews",    detail: "Crypto + geo/macro headlines",   tone: "fuchsia" as const },
] as const;

const stages = [
    { title: "Raw news filter",      text: "слабый шум отсекается",             step: "01" },
    { title: "Prioritization",       text: "новости ранжируются по влиянию",    step: "02" },
    { title: "Narrative synthesis",  text: "собирается главный рыночный угол",  step: "03" },
    { title: "Combined output",      text: "форматируется итоговая структура",  step: "04" },
    { title: "Editorial polish",     text: "финальная редактура и проверка",    step: "05" },
    { title: "DeepSeek 3.2",         text: "финальный редакторский текст",      step: "06" },
] as const;

type Tone = "cyan" | "amber" | "emerald" | "fuchsia";

function toneClasses(tone: Tone, status: "ok" | "warn" | "error" | "idle"): string {
    const base: Record<Tone, string> = {
        cyan:    "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-200",
        amber:   "border-amber-400/25 bg-amber-400/[0.07] text-amber-200",
        emerald: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200",
        fuchsia: "border-fuchsia-400/25 bg-fuchsia-400/[0.07] text-fuchsia-200",
    };
    if (status === "idle") return "border-white/8 bg-white/[0.03] text-white/40";
    if (status === "error") return "border-red-400/20 bg-red-400/[0.06] text-red-300/80";
    if (status === "warn") return "border-amber-400/20 bg-amber-400/[0.06] text-amber-200/80";
    return base[tone];
}

function dotColor(status: "ok" | "warn" | "error" | "idle"): string {
    if (status === "ok") return "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]";
    if (status === "warn") return "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.6)]";
    if (status === "error") return "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]";
    return "bg-white/20";
}

function parseStatus(v: string | undefined): "ok" | "warn" | "error" | "idle" {
    if (!v) return "idle";
    if (v === "ok") return "ok";
    if (v.includes("429") || v.startsWith("skipped")) return "warn";
    return "error";
}

type Props = { data?: MarketDigestData | null };

export function DigestPipelineVisual({ data }: Props) {
    const fetchStatus = data?.meta?.fetchStatus;
    const isLlm = data?.meta?.source === "llm";
    const pipeline = data?.meta?.llmPipeline;
    const filterSteps = pipeline?.filterSteps ?? 0;

    return (
        <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#0E1117]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="absolute -left-16 top-12 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute -right-20 bottom-8 h-48 w-48 rounded-full bg-fuchsia-400/10 blur-3xl" />

            <div className="relative">
                <div className="mb-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/70">
                        Automation map
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                        Как собирается CryptoNews
                    </h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/55">
                        Каждый день контур забирает рыночные данные и новости, пропускает их через
                        редакционные фильтры и публикует готовый текст на сайте.
                    </p>
                </div>

                {/* Source grid — real statuses when data is loaded */}
                <div className="grid grid-cols-2 gap-2">
                    {SOURCE_META.map((source, idx) => {
                        const raw = fetchStatus?.[source.key];
                        const status = parseStatus(raw);
                        const isLoading = !data;
                        return (
                            <div
                                key={source.key}
                                className={`min-h-24 rounded-2xl border p-3 transition-colors duration-500 ${
                                    isLoading
                                        ? `${toneClasses(source.tone, "ok")} animate-pulse`
                                        : toneClasses(source.tone, status)
                                }`}
                                style={isLoading ? { animationDelay: `${idx * 180}ms`, animationDuration: "2.8s" } : undefined}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                                        {source.name}
                                    </span>
                                    <span className={`h-2 w-2 rounded-full transition-colors duration-500 ${
                                        isLoading ? "bg-current animate-pulse" : dotColor(status)
                                    }`} />
                                </div>
                                <p className="mt-3 text-[11px] leading-4 text-white/55">{source.detail}</p>
                                {data && raw && raw !== "ok" && (
                                    <p className="mt-2 text-[10px] leading-4 text-white/35 truncate">
                                        {raw.startsWith("skipped") ? "нет ключа" : raw.startsWith("error: HTTP 429") ? "rate limit" : "ошибка"}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/18 to-white/8" />
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                        merge + clean
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/18 to-white/8" />
                </div>

                {/* LLM pipeline stages */}
                <div className="space-y-2.5">
                    {stages.map((stage, idx) => {
                        const stageNum = idx + 1;
                        // Stage is "done" when LLM ran and filter count covers it (or it's the final step)
                        const isDone = isLlm && (stageNum <= filterSteps || stageNum === stages.length);
                        const isFinal = stageNum === stages.length;
                        return (
                            <div
                                key={stage.step}
                                className={`group relative rounded-2xl border p-3 transition-colors ${
                                    isDone
                                        ? isFinal
                                            ? "border-cyan-400/30 bg-cyan-400/[0.05]"
                                            : "border-white/12 bg-white/[0.025]"
                                        : "border-white/8 bg-black/25"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${
                                        isDone
                                            ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                                            : "border-white/8 bg-white/[0.03] text-white/25"
                                    }`}>
                                        {stage.step}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className={`text-sm font-semibold ${isDone ? "text-white/85" : "text-white/30"}`}>
                                            {stage.title}
                                        </div>
                                        <div className={`mt-0.5 text-xs leading-5 ${isDone ? "text-white/45" : "text-white/20"}`}>
                                            {stage.text}
                                        </div>
                                    </div>
                                    {isDone && (
                                        <span className="text-[10px] text-emerald-300/70 shrink-0">✓</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Published indicator */}
                <div className={`mt-5 rounded-2xl border p-4 transition-colors ${
                    isLlm
                        ? "border-emerald-400/20 bg-emerald-400/[0.06]"
                        : data
                          ? "border-amber-400/15 bg-amber-400/[0.04]"
                          : "border-white/8 bg-white/[0.02]"
                }`}>
                    <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isLlm ? "animate-ping bg-emerald-300" : "bg-white/20"}`} />
                        <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                            isLlm ? "text-emerald-200" : data ? "text-amber-200/70" : "text-white/25"
                        }`}>
                            {isLlm ? "Published · LLM" : data ? "Published · fallback" : "Загрузка…"}
                        </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/55">
                        Результат сохраняется в{" "}
                        <span className="text-white/75">latest-digest.json</span>,
                        после чего Vercel показывает свежий блок на этой странице.
                    </p>
                </div>
            </div>
        </section>
    );
}
