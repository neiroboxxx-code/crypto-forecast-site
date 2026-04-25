"use client";

import { useEffect, useState } from "react";
import { getHealth, getMicro, getReversal, type MicroData, type ReversalData } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { fmtPctFraction, fmtPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

function biasPillTone(bias: string): string {
    if (bias === "bullish") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300";
    if (bias === "bearish") return "border-rose-400/25 bg-rose-400/10 text-rose-300";
    return "border-white/12 bg-white/5 text-white/60";
}

function biasLabel(bias: string): string {
    if (bias === "bullish") return "BULL";
    if (bias === "bearish") return "BEAR";
    if (bias === "neutral") return "NEUTRAL";
    return bias.toUpperCase();
}

export function TopBar() {
    const micro = useApi<MicroData>(getMicro);
    const reversal = useApi<ReversalData>(getReversal);

    const [health, setHealth] = useState<boolean | null>(null);
    const [healthTs, setHealthTs] = useState<string>("");

    useEffect(() => {
        let alive = true;
        async function poll() {
            const h = await getHealth();
            if (!alive) return;
            setHealth(h.ok);
            setHealthTs(h.timestamp);
        }
        poll();
        const id = setInterval(poll, 15000);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, []);

    const price = micro.data?.prediction?.current_price ?? null;
    const delta24 = micro.data?.features?.price_change_24h ?? null;
    const delta24Tone =
        delta24 === null ? "text-white/60" : delta24 >= 0 ? "text-emerald-400" : "text-rose-400";

    const bias4h = reversal.data?.market_context?.bias_4h ?? "—";
    const bias1d = reversal.data?.market_context?.bias_1d ?? "—";

    return (
        <header className="flex h-14 w-full items-center gap-4 rounded-2xl border border-white/8 bg-[#0E1117]/80 px-4">
            <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white">BTCUSDT</div>
                <div className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
                    Bybit · Perp
                </div>
            </div>

            <div className="ml-auto flex items-center gap-5">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">Last</span>
                    {price === null ? (
                        <Skeleton className="h-5 w-20" />
                    ) : (
                        <span className="text-base font-semibold tabular-nums text-white">
                            ${fmtPrice(price, 1)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">24h Δ</span>
                    {delta24 === null ? (
                        <Skeleton className="h-5 w-14" />
                    ) : (
                        <span className={`text-sm font-semibold tabular-nums ${delta24Tone}`}>
                            {fmtPctFraction(delta24)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">4H</span>
                    <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${biasPillTone(
                            bias4h,
                        )}`}
                    >
                        {biasLabel(bias4h)}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">1D</span>
                    <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${biasPillTone(
                            bias1d,
                        )}`}
                    >
                        {biasLabel(bias1d)}
                    </span>
                </div>

                <div className="flex items-center gap-2 border-l border-white/10 pl-5">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">API</span>
                    {health === null ? (
                        <span className="h-2 w-2 rounded-full bg-white/20" />
                    ) : health ? (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    ) : (
                        <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                    )}
                    <span className="text-[10px] tabular-nums text-white/45">
                        {healthTs ? new Date(healthTs).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "…"}
                    </span>
                </div>
            </div>
        </header>
    );
}
