"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveProgress } from "@/lib/library/progress";

interface PdfReaderProps {
    bookId: string;
    fileUrl: string;
    initialPage?: number;
    onProgress?: (page: number, totalPages: number, percent: number) => void;
}

export function PdfReader({ bookId, fileUrl, initialPage = 1, onProgress }: PdfReaderProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfRef = useRef<any>(null);
    const renderTaskRef = useRef<any>(null);

    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [renderScale, setRenderScale] = useState(1);

    // Save progress — throttled to avoid too many API calls
    const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleSave = useCallback((p: number, total: number) => {
        if (saveRef.current) clearTimeout(saveRef.current);
        saveRef.current = setTimeout(() => {
            const percent = total > 0 ? Math.round((p / total) * 100) : 0;
            saveProgress({ book_id: bookId, page: p, total_pages: total, percent });
            onProgress?.(p, total, percent);
        }, 1000);
    }, [bookId, onProgress]);

    // Load PDF document
    useEffect(() => {
        let cancelled = false;

        async function loadPdf() {
            try {
                setLoading(true);
                setError(null);

                // Dynamically import pdfjs to avoid SSR issues
                const pdfjs = await import("pdfjs-dist");

                // Set worker — use CDN to avoid bundling the large worker file
                if (!pdfjs.GlobalWorkerOptions.workerSrc) {
                    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
                }

                const pdf = await pdfjs.getDocument({
                    url: fileUrl,
                    cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/",
                    cMapPacked: true,
                }).promise;

                if (cancelled) return;

                pdfRef.current = pdf;
                setTotalPages(pdf.numPages);
                setLoading(false);
            } catch (err) {
                if (!cancelled) {
                    setError("Не удалось загрузить PDF");
                    setLoading(false);
                    console.error("PDF load error:", err);
                }
            }
        }

        loadPdf();
        return () => { cancelled = true; };
    }, [fileUrl]);

    // Render current page
    useEffect(() => {
        if (!pdfRef.current || !canvasRef.current || loading) return;

        let cancelled = false;

        async function renderPage() {
            if (cancelled) return;

            // Cancel any in-progress render
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
                renderTaskRef.current = null;
            }

            try {
                const pdfPage = await pdfRef.current.getPage(page);
                if (cancelled) return;

                const container = containerRef.current;
                const containerWidth = container?.clientWidth ?? 800;

                const viewport = pdfPage.getViewport({ scale: 1 });
                const scale = Math.min(containerWidth / viewport.width, 1.8);
                const scaledViewport = pdfPage.getViewport({ scale });

                const canvas = canvasRef.current!;
                const ctx = canvas.getContext("2d")!;
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                setRenderScale(scale);

                const renderTask = pdfPage.render({
                    canvasContext: ctx,
                    viewport: scaledViewport,
                });

                renderTaskRef.current = renderTask;
                await renderTask.promise;

                if (!cancelled) {
                    scheduleSave(page, pdfRef.current.numPages);
                }
            } catch (err: any) {
                if (err?.name !== "RenderingCancelledException" && !cancelled) {
                    console.error("PDF render error:", err);
                }
            }
        }

        renderPage();
        return () => { cancelled = true; };
    }, [page, loading, scheduleSave]);

    const goPrev = useCallback(() => {
        setPage((p) => Math.max(1, p - 1));
    }, []);

    const goNext = useCallback(() => {
        setPage((p) => Math.min(totalPages, p + 1));
    }, [totalPages]);

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" || e.key === "PageUp") goPrev();
            if (e.key === "ArrowRight" || e.key === "PageDown") goNext();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [goPrev, goNext]);

    const percent = totalPages > 0 ? Math.round((page / totalPages) * 100) : 0;

    return (
        <div className="flex h-full flex-col bg-[#0B0D12]">
            {/* Canvas area */}
            <div
                ref={containerRef}
                className="relative flex flex-1 flex-col items-center justify-center overflow-auto bg-[#0B0D12] px-2 py-4"
            >
                {loading && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                        <span className="text-[12px] text-white/40">Загрузка PDF…</span>
                    </div>
                )}

                {error && (
                    <div className="text-center text-sm text-red-400/80">{error}</div>
                )}

                {!loading && !error && (
                    <canvas
                        ref={canvasRef}
                        className="rounded shadow-2xl"
                        style={{ maxWidth: "100%", display: "block" }}
                    />
                )}
            </div>

            {/* Navigation bar */}
            {!loading && !error && totalPages > 0 && (
                <div className="flex shrink-0 items-center justify-between border-t border-white/8 bg-[#0E1117]/95 px-4 py-3">
                    {/* Prev */}
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={page <= 1}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                    </button>

                    {/* Page indicator + progress */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[11px] font-medium tabular-nums text-white/70">
                            {page} / {totalPages}
                        </span>
                        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-[10px] tabular-nums text-white/35">{percent}%</span>
                    </div>

                    {/* Next */}
                    <button
                        type="button"
                        onClick={goNext}
                        disabled={page >= totalPages}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    >
                        Вперёд
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
