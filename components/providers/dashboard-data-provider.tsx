"use client";

import React, { createContext, useContext } from "react";

import { useApi } from "@/hooks/use-api";
import { fetchHtfContext, getMicro, getReversal, type HtfContext, type MicroData, type ReversalData } from "@/lib/api";

type DashboardData = {
    micro: ReturnType<typeof useApi<MicroData>>;
    reversal: ReturnType<typeof useApi<ReversalData>>;
    htf: ReturnType<typeof useApi<HtfContext>>;
};

const Ctx = createContext<DashboardData | null>(null);

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
    const micro = useApi<MicroData>(getMicro, [], { intervalMs: 60_000 });
    const reversal = useApi<ReversalData>(getReversal, [], { intervalMs: 5 * 60_000 });
    const htf = useApi<HtfContext>(() => fetchHtfContext("BTCUSDT"), [], { intervalMs: 10 * 60_000 });

    return <Ctx.Provider value={{ micro, reversal, htf }}>{children}</Ctx.Provider>;
}

export function useDashboardData(): DashboardData {
    const v = useContext(Ctx);
    if (!v) throw new Error("useDashboardData must be used within DashboardDataProvider");
    return v;
}

