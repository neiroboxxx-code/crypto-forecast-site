import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AcademyMaterial } from "@/lib/mock/academy";

type Props = {
    items: AcademyMaterial[];
};

export function AcademyMaterials({ items }: Props) {
    return (
        <Card title="Материалы" subtitle="PDF и методички (заглушка UI)">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((m) => (
                    <button
                        key={m.id}
                        type="button"
                        className="group flex w-full flex-col rounded-xl border border-white/8 bg-black/25 p-3 text-left transition hover:border-cyan-400/25 hover:bg-cyan-400/5"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-cyan-200">
                                <FileText className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-semibold text-white">{m.title}</div>
                                <div className="mt-0.5 text-[11px] text-white/50">{m.topic}</div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/40">
                            <span>{m.pages} стр.</span>
                            <span className="tabular-nums text-white/45">обновлено {m.updatedAt}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-cyan-200/80 opacity-0 transition group-hover:opacity-100">
                            Открыть превью (мок)
                        </div>
                    </button>
                ))}
            </div>
        </Card>
    );
}
