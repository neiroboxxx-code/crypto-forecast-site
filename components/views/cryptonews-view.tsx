"use client";

import { useCallback, useEffect, useState } from "react";
// Digest content is static — fetched once on mount, frozen until next VPS deploy.
import type { MarketDigestData } from "@/lib/api";
import { DigestPipelineVisual } from "@/components/sections/digest-pipeline-visual";
import { MarketDigest } from "@/components/sections/market-digest";
import { DigestArchiveSidebar, type ArchiveEntry } from "@/components/sections/digest-archive";

export function CryptoNewsView() {
    const [data, setData] = useState<MarketDigestData | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [archiveEntry, setArchiveEntry] = useState<ArchiveEntry | null>(null);

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
    }, [fetchData]);

    return (
        <div className="mx-auto grid w-full max-w-[1540px] gap-4 lg:grid-cols-[280px_1fr_260px] lg:items-start">
            {/* Left — pipeline map */}
            <div className="lg:sticky lg:top-4">
                <DigestPipelineVisual data={data} />
            </div>

            {/* Center — current digest or selected archive entry */}
            <div className="min-w-0">
                <MarketDigest data={data} error={err} archiveEntry={archiveEntry} />
            </div>

            {/* Right — archive date picker */}
            <div className="lg:sticky lg:top-4">
                <DigestArchiveSidebar selected={archiveEntry} onSelect={setArchiveEntry} />
            </div>
        </div>
    );
}
