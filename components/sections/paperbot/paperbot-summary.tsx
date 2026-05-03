import { Activity, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, StatCell } from "@/components/ui/card";
import type { PaperSummary } from "@/components/sections/paperbot/types";

type Props = {
    summary: PaperSummary | null;
    /** Вертикальная колонка ячеек (админка рядом с параметрами). */
    layout?: "default" | "vertical";
};

function fmtUsd(n: number) {
    return n.toLocaleString("ru-RU", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function PaperbotSummary({ summary, layout = "default" }: Props) {
    const dash = "—";
    const pnlSession = summary ? summary.equityUsd - summary.startingUsd : null;
    const pnlTone = pnlSession != null ? (pnlSession >= 0 ? "long" : "short") : "default";
    const vertical = layout === "vertical";
    const c = vertical;

    const gridSession = vertical ? "flex flex-col gap-2" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";
    const gridLife = vertical ? "flex flex-col gap-2" : "mt-3 grid gap-3 sm:grid-cols-3";

    return (
        <Card
            className={`border-emerald-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] ${vertical ? "flex h-full min-h-0 flex-col" : ""}`}
            title="Сводка счёта"
            subtitle={vertical ? undefined : "Эквити, результат сессии и накопленная статистика"}
            right={
                <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/55">
                    <Wallet className="h-3.5 w-3.5" aria-hidden />
                    Paper
                </div>
            }
        >
            <div className={vertical ? "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5" : ""}>
                <div className={gridSession}>
                    <StatCell
                        compact={c}
                        label="Эквити"
                        value={summary ? fmtUsd(summary.equityUsd) : dash}
                        sub={summary ? (vertical ? "нереализ. вкл." : "включая нереализ.") : vertical ? "—" : "баланс + открытые позиции"}
                        tone="info"
                    />
                    <StatCell
                        compact={c}
                        label="Сессия (vs старт)"
                        value={summary && pnlSession != null ? fmtUsd(pnlSession) : dash}
                        sub={summary ? (vertical ? `старт ${fmtUsd(summary.startingUsd)}` : `старт ${fmtUsd(summary.startingUsd)}`) : vertical ? "—" : "относительно начального депозита"}
                        tone={pnlTone === "default" ? "default" : pnlTone}
                    />
                    <StatCell
                        compact={c}
                        label="Нереализ. PnL"
                        value={summary ? fmtUsd(summary.unrealizedUsd) : dash}
                        sub={!summary ? (vertical ? "—" : "по открытым позициям") : vertical ? "открытые" : undefined}
                        tone={summary ? "warn" : "default"}
                    />
                    <StatCell
                        compact={c}
                        label="Реализ. сегодня"
                        value={summary ? fmtUsd(summary.realizedTodayUsd) : dash}
                        sub={
                            summary ? (
                                vertical ? (
                                    `${summary.tradesToday} сделок`
                                ) : (
                                    <span className="inline-flex items-center gap-1">
                                        <Activity className="h-3.5 w-3.5" aria-hidden />
                                        {summary.tradesToday} сделок сегодня
                                    </span>
                                )
                            ) : (
                                vertical ? "—" : "сделки за календарный день"
                            )
                        }
                        tone={summary ? "long" : "default"}
                    />
                </div>

                <div className={gridLife}>
                    <StatCell
                        compact={c}
                        label="Win Rate (всего)"
                        value={summary ? `${summary.winRateLifetimePct.toFixed(1)}%` : dash}
                        sub={summary ? (vertical ? `${summary.totalTrades} сделок` : `${summary.totalTrades} сделок`) : vertical ? "—" : "накопленная статистика"}
                        tone={
                            summary
                                ? summary.winRateLifetimePct >= 55
                                    ? "long"
                                    : summary.winRateLifetimePct >= 45
                                    ? "warn"
                                    : "short"
                                : "default"
                        }
                    />
                    <StatCell
                        compact={c}
                        label="Макс. просадка"
                        value={summary ? `${summary.maxDrawdownPct.toFixed(1)}%` : dash}
                        sub={summary ? (vertical ? "от пика" : "от пика эквити") : vertical ? "—" : "максимальная просадка"}
                        tone={
                            summary
                                ? summary.maxDrawdownPct > 15
                                    ? "short"
                                    : summary.maxDrawdownPct > 8
                                    ? "warn"
                                    : "default"
                                : "default"
                        }
                    />
                    <StatCell
                        compact={c}
                        label="Всего сделок"
                        value={summary ? String(summary.totalTrades) : dash}
                        sub={
                            summary ? (
                                vertical ? (
                                    `win сегодня ${summary.winRatePct.toFixed(1)}%`
                                ) : (
                                    <span className="inline-flex items-center gap-1">
                                        {summary.winRateLifetimePct >= 50 ? (
                                            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                                        ) : (
                                            <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                                        )}
                                        win {summary.winRatePct.toFixed(1)}% сегодня
                                    </span>
                                )
                            ) : (
                                vertical ? "—" : "открытых + закрытых"
                            )
                        }
                    />
                </div>
            </div>
        </Card>
    );
}
