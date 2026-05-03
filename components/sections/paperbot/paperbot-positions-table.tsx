import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaperPosition } from "@/components/sections/paperbot/types";

type Props = {
    positions: PaperPosition[];
    /** Узкая плитка в ряду админки: без широкой таблицы. */
    compact?: boolean;
};

function fmtUsd(n: number) {
    return n.toLocaleString("ru-RU", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function fmtPrice(n: number) {
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function DistancePill({ pct, danger }: { pct: number; danger: boolean }) {
    const cls = danger
        ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
        : "border-white/10 bg-white/5 text-white/50";
    return (
        <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] tabular-nums ${cls}`}>
            {pct.toFixed(1)}%
        </span>
    );
}

export function PaperbotPositionsTable({ positions, compact }: Props) {
    if (compact) {
        return (
            <Card
                className="flex h-full min-h-0 flex-col border-emerald-500/10 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
                title="Активные позиции"
                subtitle={positions.length ? `${positions.length} откр.` : undefined}
                padded={false}
            >
                {positions.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-emerald-500/15 bg-black/25 py-6 text-center">
                        <p className="text-[10px] font-medium text-white/45">Нет позиций</p>
                    </div>
                ) : (
                    <div className="flex max-h-[220px] min-h-0 flex-col gap-1.5 overflow-y-auto pr-0.5">
                        {positions.map((p) => {
                            const long = p.side === "long";
                            const pnlPositive = p.pnlUsd >= 0;
                            const slClose = p.distanceToSlPct < 1.5;
                            return (
                                <div
                                    key={p.id}
                                    className="rounded-lg border border-white/8 bg-black/25 p-2 text-[10px] text-white/75"
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="truncate font-semibold text-white">{p.symbol}</span>
                                        <span
                                            className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-bold uppercase ${
                                                long
                                                    ? "border-emerald-400/30 text-emerald-200"
                                                    : "border-rose-400/30 text-rose-200"
                                            }`}
                                        >
                                            {long ? "L" : "S"}
                                        </span>
                                    </div>
                                    <div
                                        className={`mt-1 font-semibold tabular-nums ${pnlPositive ? "text-emerald-300" : "text-rose-300"}`}
                                    >
                                        {pnlPositive ? "+" : ""}
                                        {fmtUsd(p.pnlUsd)}{" "}
                                        <span className="font-normal text-white/40">
                                            ({pnlPositive ? "+" : ""}
                                            {p.pnlPct.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 tabular-nums text-[9px] text-white/45">
                                        <span>Вх {fmtPrice(p.entry)}</span>
                                        <span>Mk {fmtPrice(p.mark)}</span>
                                        <span className="text-rose-300/80">SL {fmtPrice(p.sl)}</span>
                                        <span className="text-emerald-300/80">TP {fmtPrice(p.tp)}</span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1 text-[9px] text-white/35">
                                        <DistancePill pct={p.distanceToSlPct} danger={slClose} />
                                        <DistancePill pct={p.distanceToTpPct} danger={false} />
                                        <span>{p.leverage}x</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        );
    }

    return (
        <Card
            className="border-emerald-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
            title="Активные позиции"
            subtitle="Только открытые сделки бота"
        >
            {positions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-emerald-500/15 bg-black/25 px-4 py-8 text-center">
                    <p className="text-[12px] font-medium text-white/55">Нет открытых позиций</p>
                    <p className="mx-auto mt-2 max-w-md text-[11px] leading-relaxed text-white/42">
                        Когда движок подключён, здесь появятся инструмент, сторона, размер, цена входа, марк,
                        SL / TP, расстояние до уровней и нереализованный PnL — по одной строке на каждую позицию.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] border-separate border-spacing-0 text-[12px]">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-white/40">
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Инструмент</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Сторона</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Размер</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Вход</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Марк</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">SL</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">TP</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Плечо</th>
                                <th className="border-b border-white/8 pb-2 pr-3 font-medium">Открыта</th>
                                <th className="border-b border-white/8 pb-2 text-right font-medium">PnL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {positions.map((p) => {
                                const long = p.side === "long";
                                const pnlPositive = p.pnlUsd >= 0;
                                const slClose = p.distanceToSlPct < 1.5;
                                return (
                                    <tr key={p.id} className="text-white/80">
                                        <td className="border-b border-white/6 py-2.5 pr-3 font-semibold text-white">
                                            {p.symbol}
                                        </td>
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
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums">{p.size}</td>
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums">${fmtPrice(p.entry)}</td>
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums">${fmtPrice(p.mark)}</td>
                                        <td className="border-b border-white/6 py-2.5 pr-3">
                                            <div className="tabular-nums text-rose-300/80">${fmtPrice(p.sl)}</div>
                                            <div className="mt-0.5">
                                                <DistancePill pct={p.distanceToSlPct} danger={slClose} />
                                            </div>
                                        </td>
                                        <td className="border-b border-white/6 py-2.5 pr-3">
                                            <div className="tabular-nums text-emerald-300/80">${fmtPrice(p.tp)}</div>
                                            <div className="mt-0.5">
                                                <DistancePill pct={p.distanceToTpPct} danger={false} />
                                            </div>
                                        </td>
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums">{p.leverage}x</td>
                                        <td className="border-b border-white/6 py-2.5 pr-3 tabular-nums text-white/55">
                                            {new Date(p.openedAt).toLocaleString("ru-RU", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </td>
                                        <td className="border-b border-white/6 py-2.5 text-right">
                                            <div className={`font-semibold tabular-nums ${pnlPositive ? "text-emerald-300" : "text-rose-300"}`}>
                                                {pnlPositive ? "+" : ""}
                                                {fmtUsd(p.pnlUsd)}
                                            </div>
                                            <div className="text-[11px] text-white/45">
                                                {pnlPositive ? "+" : ""}
                                                {p.pnlPct.toFixed(2)}%
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
