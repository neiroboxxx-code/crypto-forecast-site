import { ArrowDownRight, ArrowUpRight, X, Target, RefreshCw, Hand } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaperClosedTrade } from "@/components/sections/paperbot/types";

type Props = {
    trades: PaperClosedTrade[];
};

function fmtUsd(n: number) {
    return n.toLocaleString("ru-RU", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function fmtPrice(n: number) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDuration(openedAt: string, closedAt: string): string {
    const ms = new Date(closedAt).getTime() - new Date(openedAt).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    if (h >= 24) return `${Math.floor(h / 24)}д ${h % 24}ч`;
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
}

function ReasonBadge({ reason }: { reason: PaperClosedTrade["closeReason"] }) {
    if (reason === "sl") {
        return (
            <span className="inline-flex items-center gap-1 rounded border border-rose-400/30 bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                <X className="h-3 w-3" aria-hidden /> SL
            </span>
        );
    }
    if (reason === "tp") {
        return (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                <Target className="h-3 w-3" aria-hidden /> TP
            </span>
        );
    }
    if (reason === "signal_flip") {
        return (
            <span className="inline-flex items-center gap-1 rounded border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                <RefreshCw className="h-3 w-3" aria-hidden /> Сигнал
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            <Hand className="h-3 w-3" aria-hidden /> Руч.
        </span>
    );
}

export function PaperbotClosedTrades({ trades }: Props) {
    return (
        <Card
            className="border-emerald-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
            title="История сделок"
            subtitle="Закрытые позиции бота"
        >
            {trades.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-500/15 bg-black/25 px-4 py-8 text-center">
                    <p className="text-[12px] font-medium text-white/55">История пуста</p>
                    <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-white/42">
                        После закрытия первой сделки здесь появится таблица: инструмент, направление,
                        цена входа и выхода, PnL, длительность и причина закрытия (SL / TP / сигнал / вручную).
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[12px]">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-white/40">
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Сторона</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Вход</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Выход</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Плечо</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Длит.</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Причина</th>
                                <th className="border-b border-white/8 pb-2 text-right font-medium">PnL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((t) => {
                                const long = t.side === "long";
                                const win = t.pnlUsd >= 0;
                                return (
                                    <tr key={t.id} className="text-white/80">
                                        <td className="border-b border-white/6 py-2.5 pr-3">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                                    long
                                                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                                        : "border-rose-400/30 bg-rose-400/10 text-rose-200"
                                                }`}
                                            >
                                                {long ? (
                                                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                                                ) : (
                                                    <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
                                                )}
                                                {long ? "Long" : "Short"}
                                            </span>
                                        </td>
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums">${fmtPrice(t.entry)}</td>
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums">${fmtPrice(t.exit)}</td>
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums text-white/55">{t.leverage}x</td>
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums text-white/55">
                                            {fmtDuration(t.openedAt, t.closedAt)}
                                        </td>
                                        <td className="border-b border-white/6 py-2.5 pr-3">
                                            <ReasonBadge reason={t.closeReason} />
                                        </td>
                                        <td className="border-b border-white/6 py-2.5 text-right">
                                            <div className={`font-semibold tabular-nums ${win ? "text-emerald-300" : "text-rose-300"}`}>
                                                {win ? "+" : ""}
                                                {fmtUsd(t.pnlUsd)}
                                            </div>
                                            <div className="text-[11px] text-white/45">
                                                {win ? "+" : ""}
                                                {t.pnlPct.toFixed(2)}%
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}
