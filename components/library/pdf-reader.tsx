"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveProgress } from "@/lib/library/progress";

interface PdfReaderProps {
    bookId: string;
    fileUrl: string;
    initialPage?: number;
}

export function PdfReader({ bookId, fileUrl, initialPage = 1 }: PdfReaderProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfRef = useRef<any>(null);
    const renderTaskRef = useRef<any>(null);
    const currentPageRef = useRef(initialPage);

    const [page, setPage] = useState(initialPage);
    const [totalPages, setTotalPages] = useState(0);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [loadMsg, setLoadMsg] = useState("Инициализация…");

    // ── Stable scale: based on viewport, not canvas container ──────────────
    function calcScale(vpWidth: number, vpHeight: number, pdfW: number, pdfH: number): number {
        // Reserve space for header (48px) and nav bar (64px) + 32px padding
        const maxH = vpHeight - 48 - 64 - 32;
        const maxW = vpWidth - 32;
        const byW = maxW / pdfW;
        const byH = maxH / pdfH;
        return Math.min(byW, byH, 2.5); // cap at 2.5x
    }

    // ── Render a specific page ──────────────────────────────────────────────
    const renderPage = useCallback(async (pageNum: number) => {
        if (!pdfRef.current || !canvasRef.current) return;

        // Cancel any pending render
        if (renderTaskRef.current) {
            renderTaskRef.current.cancel();
            renderTaskRef.current = null;
        }

        try {
            const pdfPage = await pdfRef.current.getPage(pageNum);
            const nativeVp = pdfPage.getViewport({ scale: 1 });
            const scale = calcScale(
                window.innerWidth,
                window.innerHeight,
                nativeVp.width,
                nativeVp.height,
            );
            const vp = pdfPage.getViewport({ scale });

            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d")!;
            // Set exact pixel dimensions — prevents layout shifts
            canvas.width = vp.width;
            canvas.height = vp.height;
            canvas.style.width = `${vp.width}px`;
            canvas.style.height = `${vp.height}px`;

            const task = pdfPage.render({ canvasContext: ctx, viewport: vp });
            renderTaskRef.current = task;
            await task.promise;

            // Save progress (debounced 1s)
            const total = pdfRef.current.numPages;
            const pct = Math.round((pageNum / total) * 100);
            saveProgress({ book_id: bookId, page: pageNum, total_pages: total, percent: pct });
        } catch (e: any) {
            if (e?.name !== "RenderingCancelledException") {
                console.error("PDF render error:", e);
            }
        }
    }, [bookId]);

    // ── Load PDF document ───────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setStatus("loading");
                setLoadMsg("Загрузка PDF.js…");

                const pdfjs = await import("pdfjs-dist");
                if (cancelled) return;

                // Use local worker (no CDN, no CORS issues)
                pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

                setLoadMsg("Загрузка файла…");

                const pdf = await pdfjs.getDocument({
                    url: fileUrl,
                    // Range requests — loads pages on demand, not the whole file at once
                    rangeChunkSize: 65536,
                    disableAutoFetch: false,
                    disableStream: false,
                }).promise;

                if (cancelled) return;
                pdfRef.current = pdf;
                setTotalPages(pdf.numPages);
                setStatus("ready");
            } catch (e) {
                if (!cancelled) {
                    console.error("PDF load error:", e);
                    setStatus("error");
                }
            }
        }

        load();
        return () => { cancelled = true; };
    }, [fileUrl]);

    // ── Render whenever page changes or PDF becomes ready ──────────────────
    useEffect(() => {
        if (status !== "ready") return;
        currentPageRef.current = page;
        renderPage(page);
    }, [page, status, renderPage]);

    // ── Re-render on window resize (debounced) ─────────────────────────────
    useEffect(() => {
        if (status !== "ready") return;
        let timer: ReturnType<typeof setTimeout>;
        const onResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => renderPage(currentPageRef.current), 200);
        };
        window.addEventListener("resize", onResize);
        return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
    }, [status, renderPage]);

    // ── Keyboard navigation ─────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft"  || e.key === "PageUp")   setPage((p) => Math.max(1, p - 1));
            if (e.key === "ArrowRight" || e.key === "PageDown") setPage((p) => Math.min(totalPages, p + 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [totalPages]);

    const percent = totalPages > 0 ? Math.round((page / totalPages) * 100) : 0;

    return (
        <div className="flex h-full flex-col bg-[#0B0D12]">
            {/* ── Canvas area — FIXED, never resizes to fit content ── */}
            <div
                ref={containerRef}
                className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0B0D12]"
            >
                {status === "loading" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                        <span className="text-[12px] text-white/40">{loadMsg}</span>
                    </div>
                )}

                {status === "error" && (
                    <div className="text-sm text-red-400/80">Не удалось загрузить PDF</div>
                )}

                {/* Canvas always rendered (hidden while loading) */}
                <canvas
                    ref={canvasRef}
                    className="shadow-2xl transition-opacity duration-200"
                    style={{
                        display: "block",
                        opacity: status === "ready" ? 1 : 0,
                        maxWidth: "100%",
                        maxHeight: "100%",
                    }}
                />
            </div>

            {/* ── Navigation bar ── */}
            {status === "ready" && totalPages > 0 && (
                <div className="flex shrink-0 items-center justify-between border-t border-white/8 bg-[#0E1117]/95 px-4 py-3">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white/80 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                    </button>

                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[11px] font-medium tabular-nums text-white/70">
                            {page} / {totalPages}
                        </span>
                        <div className="h-1 w-36 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-[10px] tabular-nums text-white/35">{percent}%</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
