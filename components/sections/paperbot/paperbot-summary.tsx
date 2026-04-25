import { Activity, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, StatCell } from "@/components/ui/card";
import type { PaperSummary } from "@/components/sections/paperbot/types";

type Props = {
    summary: PaperSummary | null;
};

function fmtUsd(n: number) {
    return n.toLocaleString("ru-RU", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function PaperbotSummary({ summary }: Props) {
    const dash = "—";
    const pnlSession = summary ? summary.equityUsd - summary.startingUsd : null;
    const pnlTone = pnlSession != null ? (pnlSession >= 0 ? "long" : "short") : "default";

    return (
        <Card
            className="border-emerald-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
            title="Сводка счёта"
            subtitle="Эквити, результат сессии и накопленная статистика"
            right={
                <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/55">
                    <Wallet className="h-3.5 w-3.5" aria-hidden />
                    Paper
                </div>
            }
        >
            {/* Row 1: current session */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCell
                    label="Эквити"
                    value={summary ? fmtUsd(summary.equityUsd) : dash}
                    sub={summary ? "включая нереализ." : "баланс + открытые позиции"}
                    tone="info"
                />
                <StatCell
                    label="Сессия (vs старт)"
                    value={summary && pnlSession != null ? fmtUsd(pnlSession) : dash}
                    sub={summary ? `старт ${fmtUsd(summary.startingUsd)}` : "относительно начального депозита"}
                    tone={pnlTone === "default" ? "default" : pnlTone}
                />
                <StatCell
                    label="Нереализ. PnL"
                    value={summary ? fmtUsd(summary.unrealizedUsd) : dash}
                    sub={summary ? undefined : "по открытым позициям"}
                    tone={summary ? "warn" : "default"}
                />
                <StatCell
                    label="Реализ. сегодня"
                    value={summary ? fmtUsd(summary.realizedTodayUsd) : dash}
                    sub={
                        summary ? (
                            <span className="inline-flex items-center gap-1">
                                <Activity className="h-3.5 w-3.5" aria-hidden />
                                {summary.tradesToday} сделок сегодня
                            </span>
                        ) : (
                            "сделки за календарный день"
                        )
                    }
                    tone={summary ? "long" : "default"}
                />
            </div>

            {/* Row 2: lifetime stats */}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <StatCell
                    label="Win Rate (всего)"
                    value={summary ? `${summary.winRateLifetimePct.toFixed(1)}%` : dash}
                    sub={summary ? `${summary.totalTrades} сделок` : "накопленная статистика"}
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
                    label="Макс. просадка"
                    value={summary ? `${summary.maxDrawdownPct.toFixed(1)}%` : dash}
                    sub={summary ? "от пика эквити" : "максимальная просадка"}
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
                    label="Всего сделок"
                    value={summary ? String(summary.totalTrades) : dash}
                    sub={
                        summary ? (
                            <span className="inline-flex items-center gap-1">
                                {summary.winRateLifetimePct >= 50 ? (
                                    <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                                ) : (
                                    <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                                )}
                                win {summary.winRatePct.toFixed(1)}% сегодня
                            </span>
                        ) : (
                            "открытых + закрытых"
                        )
                    }
                />
            </div>
        </Card>
    );
}
