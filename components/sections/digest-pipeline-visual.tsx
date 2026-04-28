import type { MarketDigestData } from "@/lib/api";

const SOURCES = [
    {
        key: "bybit",
        name: "Bybit",
        tone: "cyan" as const,
        assets: ["₿", "Ξ", "◎", "ONDO", "LINK"],
    },
    {
        key: "fred",
        name: "FRED",
        tone: "amber" as const,
        assets: ["S&P", "NDX", "VIX", "WTI"],
    },
    {
        key: "newsdata",
        name: "NewsData",
        tone: "emerald" as const,
        assets: ["BTC", "ETH", "crypto"],
    },
    {
        key: "gnews_crypto",
        name: "GNews",
        tone: "fuchsia" as const,
        assets: ["geo", "macro"],
    },
] as const;

const STAGES = [
    { step: "01", title: "News filter",         text: "шум отсекается" },
    { step: "02", title: "Prioritization",      text: "ранжирование по влиянию" },
    { step: "03", title: "Narrative synthesis", text: "главный рыночный угол" },
    { step: "04", title: "Combined output",     text: "итоговая структура" },
    { step: "05", title: "Editorial polish",    text: "финальная редактура" },
    { step: "06", title: "DeepSeek 3.2",        text: "публикация" },
] as const;

type Tone = "cyan" | "amber" | "emerald" | "fuchsia";

const TONE_CLASSES: Record<Tone, string> = {
    cyan:    "border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-200",
    amber:   "border-amber-400/25 bg-amber-400/[0.07] text-amber-200",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200",
    fuchsia: "border-fuchsia-400/25 bg-fuchsia-400/[0.07] text-fuchsia-200",
};

function dotColor(status: "ok" | "warn" | "error" | "idle"): string {
    if (status === "ok")    return "bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.7)]";
    if (status === "warn")  return "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.6)]";
    if (status === "error") return "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]";
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
        <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-[#0E1117]/80 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            <div className="absolute -left-12 top-8 h-32 w-32 rounded-full bg-cyan-400/8 blur-3xl pointer-events-none" />
            <div className="absolute -right-16 bottom-6 h-36 w-36 rounded-full bg-fuchsia-400/8 blur-3xl pointer-events-none" />

            <div className="relative space-y-4">

                {/* Header */}
                <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-200/60">
                        Automation map
                    </div>
                    <h2 className="mt-1 text-base font-semibold tracking-tight text-white">
                        Как собирается дайджест
                    </h2>
                </div>

                {/* Sources — compact rows */}
                <div className="space-y-1.5">
                    {SOURCES.map((src, idx) => {
                        const raw = fetchStatus?.[src.key];
                        const status = parseStatus(raw);
                        const isLoading = !data;
                        return (
                            <div
                                key={src.key}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors duration-500 ${
                                    isLoading
                                        ? `${TONE_CLASSES[src.tone]} animate-pulse`
                                        : status === "idle"
                                          ? "border-white/8 bg-white/[0.03]"
                                          : status === "error"
                                            ? "border-red-400/20 bg-red-400/[0.05]"
                                            : TONE_CLASSES[src.tone]
                                }`}
                                style={isLoading ? { animationDelay: `${idx * 180}ms`, animationDuration: "2.8s" } : undefined}
                            >
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-500 ${
                                    isLoading ? "bg-current opacity-60 animate-pulse" : dotColor(status)
                                }`} />
                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] shrink-0">
                                    {src.name}
                                </span>
                                <div className="ml-auto flex flex-wrap justify-end gap-1">
                                    {src.assets.map((a) => (
                                        <span
                                            key={a}
                                            className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[9px] text-white/45"
                                        >
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
                    <span className="text-[9px] uppercase tracking-[0.16em] text-white/30">merge</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-transparent" />
                </div>

                {/* LLM stages — compact */}
                <div className="space-y-1.5">
                    {STAGES.map((stage, idx) => {
                        const stageNum = idx + 1;
                        const isDone = isLlm && (stageNum <= filterSteps || stageNum === STAGES.length);
                        const isFinal = stageNum === STAGES.length;
                        return (
                            <div
                                key={stage.step}
                                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                                    isDone
                                        ? isFinal
                                            ? "border-cyan-400/30 bg-cyan-400/[0.05]"
                                            : "border-white/10 bg-white/[0.02]"
                                        : "border-white/6 bg-black/20"
                                }`}
                            >
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[9px] font-bold ${
                                    isDone
                                        ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                                        : "border-white/8 bg-white/[0.03] text-white/20"
                                }`}>
                                    {stage.step}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <span className={`text-[11px] font-semibold ${isDone ? "text-white/80" : "text-white/25"}`}>
                                        {stage.title}
                                    </span>
                                    <span className={`ml-1.5 text-[10px] ${isDone ? "text-white/35" : "text-white/15"}`}>
                                        {stage.text}
                                    </span>
                                </div>
                                {isDone && (
                                    <span className="shrink-0 text-[10px] text-emerald-300/60">✓</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Published indicator */}
                <div className={`rounded-xl border p-3 transition-colors ${
                    isLlm
                        ? "border-emerald-400/20 bg-emerald-400/[0.05]"
                        : data
                          ? "border-amber-400/15 bg-amber-400/[0.04]"
                          : "border-white/8 bg-white/[0.02]"
                }`}>
                    <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${isLlm ? "animate-ping bg-emerald-300" : "bg-white/20"}`} />
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            isLlm ? "text-emerald-200" : data ? "text-amber-200/70" : "text-white/25"
                        }`}>
                            {isLlm ? "Published · LLM" : data ? "Published · fallback" : "Загрузка…"}
                        </span>
                    </div>
                    <p className="mt-1.5 text-[10px] leading-4 text-white/40">
                        Обновляется ежедневно в 06:15 UTC.
                        Предыдущие выпуски сохраняются в архиве.
                    </p>
                </div>

            </div>
        </section>
    );
}
