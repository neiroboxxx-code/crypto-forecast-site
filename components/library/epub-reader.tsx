"use client";

// react-reader (epub.js wrapper) must be imported dynamically:
// it accesses `window` on import, which breaks SSR in Next.js App Router.
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { saveProgress } from "@/lib/library/progress";

// ── Dynamically import ReactReader — no SSR ────────────────────────────────
const ReactReader = dynamic(
    () => import("react-reader").then((m) => m.ReactReader),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full items-center justify-center bg-[#0E1117]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                    <span className="text-[12px] text-white/40">Загрузка книги…</span>
                </div>
            </div>
        ),
    },
);

// ── Dark theme override injected into the epub iframe ─────────────────────
const EPUB_DARK_THEME = {
    "*": {
        background: "#0E1117 !important",
        color: "#d1d5db !important",
        "font-family": "Georgia, 'Times New Roman', serif !important",
        "line-height": "1.7 !important",
    },
    a: { color: "#67e8f9 !important" },
};

// ── Component ───────────────────────────────────────────────────────────────

interface EpubReaderProps {
    bookId: string;
    fileUrl: string;
    initialCfi?: string | null;
}

export function EpubReader({ bookId, fileUrl, initialCfi }: EpubReaderProps) {
    const [location, setLocation] = useState<string | number>(initialCfi ?? 0);
    const [percent, setPercent] = useState(0);
    const renditionRef = useRef<any>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLocationChange = useCallback((cfi: string) => {
        setLocation(cfi);

        // Try to compute percent
        const book = renditionRef.current?.book;
        if (book?.locations?.total > 0) {
            const pct = Math.round(book.locations.percentageFromCfi(cfi) * 100);
            setPercent(pct);
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
                saveProgress({ book_id: bookId, page: 1, percent: pct, cfi });
            }, 1500);
        } else {
            // locations not yet generated — save cfi only
            if (saveTimer.current) clearTimeout(saveTimer.current);
            saveTimer.current = setTimeout(() => {
                saveProgress({ book_id: bookId, page: 1, percent: 0, cfi });
            }, 1500);
        }
    }, [bookId]);

    const getRendition = useCallback((rendition: any) => {
        renditionRef.current = rendition;

        // Apply dark theme
        rendition.themes.register("dark", EPUB_DARK_THEME);
        rendition.themes.select("dark");

        // Generate locations for % progress (runs in background, non-blocking)
        rendition.book?.ready?.then(() => {
            rendition.book.locations.generate(1500).catch(() => {});
        }).catch(() => {});
    }, []);

    return (
        <div className="flex h-full flex-col bg-[#0E1117]">
            {/* EPUB viewport — full height */}
            <div className="relative min-h-0 flex-1">
                <ReactReader
                    url={fileUrl}
                    location={location}
                    locationChanged={handleLocationChange}
                    getRendition={getRendition}
                    showToc
                    epubOptions={{ allowScriptedContent: false }}
                    readerStyles={{
                        container: { background: "#0E1117", height: "100%" },
                        readerArea: { background: "#0E1117" },
                        arrow: {
                            color: "rgba(255,255,255,0.35)",
                            fontSize: 30,
                        },
                        arrowHover: { color: "#ffffff" },
                        titleArea: {
                            color: "rgba(255,255,255,0.3)",
                            fontSize: 10,
                            paddingTop: 4,
                        },
                    }}
                />
            </div>

            {/* Progress bar — shown once locations are ready */}
            {percent > 0 && (
                <div className="shrink-0 border-t border-white/8 bg-[#0E1117]/95 px-4 py-2">
                    <div className="flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-[10px] tabular-nums text-white/35">{percent}%</span>
                    </div>
                </div>
            )}
        </div>
    );
}
