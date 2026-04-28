"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketDigestData } from "@/lib/api";
import { DigestPipelineVisual } from "@/components/sections/digest-pipeline-visual";
import { MarketDigest } from "@/components/sections/market-digest";
import { DigestArchive } from "@/components/sections/digest-archive";

const REFRESH_MS = 10 * 60 * 1000;

export function CryptoNewsView() {
    const [data, setData] = useState<MarketDigestData | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/digest", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = (await res.json()) as MarketDigestData;
            setData(json);
            setErr(null);
        } catch {
            setErr("Не удалось загрузить дайджест");
        }
    }, []);

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, REFRESH_MS);
        const onVisibility = () => { if (!document.hidden) fetchData(); };
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [fetchData]);

    return (
        <div className="mx-auto grid w-full max-w-[1540px] gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
            {/* Left — compact pipeline map */}
            <div className="lg:sticky lg:top-4">
                <DigestPipelineVisual data={data} />
            </div>

            {/* Right — current digest + archive */}
            <div className="min-w-0">
                <MarketDigest data={data} error={err} />
                <DigestArchive />
            </div>
        </div>
    );
}
