import { BookOpen, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AcademyReport } from "@/lib/mock/academy";

type Props = {
    reports: AcademyReport[];
};

function phaseLabel(phase: AcademyReport["phase"]) {
    return phase === "phase_1" ? "Phase 1" : "Phase 2";
}

function phaseTone(phase: AcademyReport["phase"]) {
    return phase === "phase_1"
        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
        : "border-violet-400/30 bg-violet-400/10 text-violet-100";
}

export function AcademyReportArchive({ reports }: Props) {
    return (
        <Card
            title="Архив отчётов"
            subtitle="Исторические LLM-транскрипты разворотов (мок-данные)"
            right={
                <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/55">
                    <Layers className="h-3.5 w-3.5" aria-hidden />
                    Phase 1 / 2
                </div>
            }
        >
            <div className="flex flex-col gap-2">
                {reports.map((r) => (
                    <article
                        key={r.id}
                        className="rounded-xl border border-white/8 bg-black/25 p-3 transition hover:border-white/12"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-[13px] font-semibold leading-snug text-white">{r.title}</h3>
                                    <span
                                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${phaseTone(
                                            r.phase,
                                        )}`}
                                    >
                                        {phaseLabel(r.phase)}
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                                    <span className="font-medium text-white/60">{r.symbol}</span>
                                    <span className="tabular-nums">
                                        {new Date(r.recordedAt).toLocaleString("ru-RU", {
                                            day: "2-digit",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-cyan-400/30 hover:text-cyan-100"
                            >
                                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                                Читать
                            </button>
                        </div>
                        <p className="mt-2 text-[12px] leading-relaxed text-white/55">{r.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {r.tags.map((t) => (
                                <span
                                    key={t}
                                    className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </Card>
    );
}
