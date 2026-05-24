"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveProgress } from "@/lib/library/progress";

interface EpubReaderProps {
    bookId: string;
    fileUrl: string;
    initialCfi?: string | null;
    onProgress?: (percent: number, cfi: string) => void;
}

export function EpubReader({ bookId, fileUrl, initialCfi, onProgress }: EpubReaderProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [percent, setPercent] = useState(0);

    const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleSave = useCallback((pct: number, cfi: string) => {
        if (saveRef.current) clearTimeout(saveRef.current);
        saveRef.current = setTimeout(() => {
            saveProgress({ book_id: bookId, page: 1, percent: pct, cfi });
            onProgress?.(pct, cfi);
        }, 1000);
    }, [bookId, onProgress]);

    useEffect(() => {
        if (!viewerRef.current) return;
        let cancelled = false;

        async function loadEpub() {
            try {
                setLoading(true);
                setError(null);

                // Dynamic import — avoids SSR issues with epub.js / DOM manipulation
                const { ReactReader } = await import("react-reader");

                if (cancelled) return;
                setLoading(false);
            } catch (err) {
                if (!cancelled) {
                    setError("Не удалось загрузить epub.js");
                    setLoading(false);
                }
            }
        }

        loadEpub();
        return () => { cancelled = true; };
    }, [fileUrl]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0B0D12]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                    <span className="text-[12px] text-white/40">Загрузка книги…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0B0D12]">
                <div className="text-center text-sm text-red-400/80">{error}</div>
            </div>
        );
    }

    return (
        <EpubReaderInner
            bookId={bookId}
            fileUrl={fileUrl}
            initialCfi={initialCfi}
            onProgress={onProgress}
        />
    );
}

// Separate inner component to allow dynamic import of ReactReader
function EpubReaderInner({
    bookId,
    fileUrl,
    initialCfi,
    onProgress,
}: EpubReaderProps) {
    const [location, setLocation] = useState<string | null>(initialCfi ?? null);
    const [percent, setPercent] = useState(0);
    const renditionRef = useRef<any>(null);
    const [ReactReaderComponent, setReactReaderComponent] = useState<any>(null);

    useEffect(() => {
        import("react-reader").then((m) => {
            setReactReaderComponent(() => m.ReactReader);
        });
    }, []);

    const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleLocationChange = useCallback((cfi: string) => {
        setLocation(cfi);

        // Calculate percent from rendition
        const rendition = renditionRef.current;
        if (rendition?.book?.locations) {
            const book = rendition.book;
            book.locations.percentageFromCfi(cfi).then((pct: number) => {
                const pctInt = Math.round(pct * 100);
                setPercent(pctInt);
                if (saveRef.current) clearTimeout(saveRef.current);
                saveRef.current = setTimeout(() => {
                    saveProgress({ book_id: bookId, page: 1, percent: pctInt, cfi });
                    onProgress?.(pctInt, cfi);
                }, 1000);
            }).catch(() => {});
        }
    }, [bookId, onProgress]);

    // Apply dark theme to epub iframe
    const getRendition = useCallback((rendition: any) => {
        renditionRef.current = rendition;
        rendition.themes.register("dark", {
            body: {
                background: "#0E1117 !important",
                color: "#d1d5db !important",
            },
            "p, div, span": {
                color: "#d1d5db !important",
            },
        });
        rendition.themes.select("dark");

        // Generate locations for progress tracking
        if (rendition.book) {
            rendition.book.ready.then(() => {
                rendition.book.locations.generate(1000).catch(() => {});
            }).catch(() => {});
        }
    }, []);

    if (!ReactReaderComponent) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0B0D12]">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-[#0E1117]">
            <div className="flex-1 overflow-hidden">
                <ReactReaderComponent
                    url={fileUrl}
                    location={location}
                    locationChanged={handleLocationChange}
                    getRendition={getRendition}
                    showToc
                    epubOptions={{
                        allowScriptedContent: false,
                    }}
                    styles={{
                        container: {
                            background: "#0E1117",
                        },
                        readerArea: {
                            background: "#0E1117",
                        },
                        arrow: {
                            color: "rgba(255,255,255,0.4)",
                            fontSize: 28,
                        },
                        arrowHover: {
                            color: "rgba(255,255,255,0.9)",
                        },
                        titleArea: {
                            color: "rgba(255,255,255,0.4)",
                            fontSize: 10,
                        },
                    }}
                />
            </div>

            {/* Progress bar */}
            {percent > 0 && (
                <div className="shrink-0 border-t border-white/8 bg-[#0E1117]/95 px-4 py-2">
                    <div className="flex items-center gap-3">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
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
