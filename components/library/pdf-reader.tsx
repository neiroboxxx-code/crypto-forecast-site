"use client";

/**
 * PDF Reader — two view modes:
 *   "spread"  — two-page book spread, centered, fits screen (default)
 *   "scroll"  — single page centered, vertical scroll, zoom ±
 *
 * Renders as position:fixed overlay over the entire site.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { saveProgress } from "@/lib/library/progress";

interface PdfReaderProps {
    bookId: string;
    title: string;
    fileUrl: string;
    initialPage?: number;
    onClose: () => void;
}

type ViewMode = "spread" | "scroll";

// Layout constants (px)
const HEADER_H = 48;
const NAV_H    = 52;
const PAD_V    = 20;
const PAD_H    = 48;

// ── Scale helpers ─────────────────────────────────────────────────────────────

function calcSpreadScale(vpW: number, vpH: number, pdfW: number, pdfH: number, twoPages: boolean): number {
    const availH = vpH - HEADER_H - NAV_H - PAD_V;
    const availW = twoPages ? (vpW - PAD_H) / 2 - 8 : vpW - PAD_H;
    return Math.min(availW / pdfW, availH / pdfH, 2.5);
}

function calcScrollScale(vpW: number, pdfW: number, zoom: number): number {
    // zoom=1 → fit-width; zoom<1 → smaller; zoom>1 → larger (overflows → scroll)
    const fitWidth = (vpW - PAD_H) / pdfW;
    return Math.min(fitWidth * zoom, 5);
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

async function renderPageToCanvas(pdfDoc: any, pageNum: number, canvas: HTMLCanvasElement, scale: number) {
    const pdfPage = await pdfDoc.getPage(pageNum);
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    const vp  = pdfPage.getViewport({ scale: scale * dpr });
    const ctx = canvas.getContext("2d")!;
    canvas.width  = vp.width;
    canvas.height = vp.height;
    canvas.style.width  = `${vp.width  / dpr}px`;
    canvas.style.height = `${vp.height / dpr}px`;
    await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PdfReader({ bookId, title, fileUrl, initialPage = 1, onClose }: PdfReaderProps) {
    const leftRef   = useRef<HTMLCanvasElement>(null);
    const rightRef  = useRef<HTMLCanvasElement>(null);
    const pdfRef    = useRef<any>(null);
    const renderGen = useRef(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const normalise = (p: number) => (p % 2 === 0 ? Math.max(1, p - 1) : p);

    const [leftPage,   setLeftPage]   = useState(() => normalise(initialPage));
    const [totalPages, setTotalPages] = useState(0);
    const [status,     setStatus]     = useState<"loading" | "ready" | "error">("loading");
    const [loadMsg,    setLoadMsg]    = useState("Загрузка…");
    const [viewMode,   setViewMode]   = useState<ViewMode>("spread");
    const [zoomLevel,  setZoomLevel]  = useState(1); // 1 = fit-width in scroll mode

    // ── Load PDF ──────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                setStatus("loading");
                setLoadMsg("Инициализация PDF.js…");
                const pdfjs = await import("pdfjs-dist");
                pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
                setLoadMsg("Загрузка файла…");
                const pdf = await pdfjs.getDocument({ url: fileUrl, rangeChunkSize: 65536 }).promise;
                if (cancelled) return;
                pdfRef.current = pdf;
                setTotalPages(pdf.numPages);
                setStatus("ready");
            } catch {
                if (!cancelled) setStatus("error");
            }
        }
        load();
        return () => { cancelled = true; };
    }, [fileUrl]);

    // ── Render pages ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (status !== "ready" || !pdfRef.current) return;
        const gen = ++renderGen.current;

        async function render() {
            const pdf   = pdfRef.current;
            const total = pdf.numPages;

            const refPage  = await pdf.getPage(leftPage);
            const nativeVp = refPage.getViewport({ scale: 1 });

            if (gen !== renderGen.current) return;

            if (viewMode === "spread") {
                const right  = leftPage + 1;
                const twoP   = right <= total;
                const scale  = calcSpreadScale(window.innerWidth, window.innerHeight, nativeVp.width, nativeVp.height, twoP);

                if (leftRef.current)
                    await renderPageToCanvas(pdf, leftPage, leftRef.current, scale);

                if (gen !== renderGen.current) return;

                if (twoP && rightRef.current) {
                    await renderPageToCanvas(pdf, right, rightRef.current, scale);
                } else if (rightRef.current) {
                    rightRef.current.width = 0;
                    rightRef.current.height = 0;
                }
            } else {
                // scroll mode — single page
                const scale = calcScrollScale(window.innerWidth, nativeVp.width, zoomLevel);

                if (leftRef.current)
                    await renderPageToCanvas(pdf, leftPage, leftRef.current, scale);

                // scroll back to top on page change
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
            }

            if (gen !== renderGen.current) return;

            const pct = Math.round((leftPage / total) * 100);
            saveProgress({ book_id: bookId, page: leftPage, total_pages: total, percent: pct });
        }

        render();
    }, [leftPage, status, bookId, viewMode, zoomLevel]);

    // ── Resize ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (status !== "ready") return;
        let timer: ReturnType<typeof setTimeout>;
        const onResize = () => { clearTimeout(timer); timer = setTimeout(() => setLeftPage((p) => p), 200); };
        window.addEventListener("resize", onResize);
        return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
    }, [status]);

    // ── Keyboard ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { onClose(); return; }
            if (e.key === "ArrowLeft"  || e.key === "PageUp")
                setLeftPage((p) => normalise(Math.max(1, viewMode === "spread" ? p - 2 : p - 1)));
            if (e.key === "ArrowRight" || e.key === "PageDown")
                setLeftPage((p) => normalise(Math.min(totalPages, viewMode === "spread" ? p + 2 : p + 1)));
            if ((e.metaKey || e.ctrlKey) && e.key === "=") { e.preventDefault(); setZoomLevel((z) => Math.min(4, +(z + 0.25).toFixed(2))); }
            if ((e.metaKey || e.ctrlKey) && e.key === "-") { e.preventDefault(); setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2))); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [totalPages, onClose, viewMode]);

    const goPrev = () => setLeftPage((p) => normalise(Math.max(1, viewMode === "spread" ? p - 2 : p - 1)));
    const goNext = () => setLeftPage((p) => {
        const next = viewMode === "spread" ? p + 2 : p + 1;
        return normalise(Math.min(totalPages, next));
    });

    const rightPage = leftPage + 1;
    const hasRight  = viewMode === "spread" && rightPage <= totalPages;
    const percent   = totalPages > 0 ? Math.round((leftPage / totalPages) * 100) : 0;
    const canGoPrev = leftPage > 1;
    const canGoNext = viewMode === "spread" ? leftPage + 1 < totalPages : leftPage < totalPages;

    return (
        <div className="fixed inset-0 z-[999] flex flex-col bg-[#0B0D12]">

            {/* ── Header ── */}
            <div
                className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-[#0E1117] px-4"
                style={{ height: HEADER_H }}
            >
                {/* Back */}
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:text-white"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    На полку
                </button>

                <div className="mx-1 h-4 w-px bg-white/10" />

                {/* Title */}
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/80">
                    {title}
                </span>

                {/* View mode toggle */}
                <div className="flex overflow-hidden rounded-md border border-white/10">
                    <button
                        type="button"
                        onClick={() => setViewMode("spread")}
                        className={`px-3 py-1.5 text-[11px] font-medium transition ${viewMode === "spread" ? "bg-cyan-400/20 text-cyan-400" : "text-white/35 hover:text-white/70"}`}
                    >
                        Разворот
                    </button>
                    <div className="w-px bg-white/10" />
                    <button
                        type="button"
                        onClick={() => { setViewMode("scroll"); setZoomLevel(1); }}
                        className={`px-3 py-1.5 text-[11px] font-medium transition ${viewMode === "scroll" ? "bg-cyan-400/20 text-cyan-400" : "text-white/35 hover:text-white/70"}`}
                    >
                        Страница
                    </button>
                </div>

                {/* Zoom controls — scroll mode only */}
                {viewMode === "scroll" && (
                    <div className="flex items-center gap-1 rounded-md border border-white/10 px-1">
                        <button
                            type="button"
                            onClick={() => setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                            className="rounded p-1 text-white/50 transition hover:bg-white/8 hover:text-white"
                            aria-label="Уменьшить"
                        >
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-[11px] tabular-nums text-white/50">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={() => setZoomLevel((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                            className="rounded p-1 text-white/50 transition hover:bg-white/8 hover:text-white"
                            aria-label="Увеличить"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                {/* Page counter */}
                {totalPages > 0 && (
                    <span className="text-[11px] tabular-nums text-white/35">
                        {hasRight ? `${leftPage}–${rightPage}` : `${leftPage}`} / {totalPages}
                    </span>
                )}

                {/* Close */}
                <button
                    type="button"
                    onClick={onClose}
                    className="ml-1 rounded-md p-1.5 text-white/30 transition hover:bg-white/8 hover:text-white/70"
                    aria-label="Закрыть"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* ── Content area ── */}
            {viewMode === "spread" ? (
                /* ── SPREAD MODE ── two canvases side by side, centered ── */
                <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#0B0D12]">
                    {status === "loading" && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                            <span className="text-[13px] text-white/40">{loadMsg}</span>
                        </div>
                    )}
                    {status === "error" && (
                        <p className="text-sm text-red-400/80">Не удалось загрузить PDF</p>
                    )}

                    <div
                        className="flex items-stretch gap-0"
                        style={{ opacity: status === "ready" ? 1 : 0, transition: "opacity .2s" }}
                    >
                        <div className="flex items-center justify-end">
                            <canvas ref={leftRef} style={{ display: "block", borderRadius: "3px 0 0 3px", boxShadow: "4px 0 32px rgba(0,0,0,0.8)" }} />
                        </div>
                        <div className="shrink-0 self-stretch" style={{ width: 4, background: "linear-gradient(to right,#111320,#1e2044,#111320)", boxShadow: "0 0 16px rgba(80,80,180,0.2)" }} />
                        <div className="flex items-center justify-start">
                            {hasRight ? (
                                <canvas ref={rightRef} style={{ display: "block", borderRadius: "0 3px 3px 0", boxShadow: "-4px 0 32px rgba(0,0,0,0.8)" }} />
                            ) : (
                                <div style={{ width: 40, alignSelf: "stretch", borderRadius: "0 3px 3px 0", background: "#0d0d1a", opacity: 0.3 }} />
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* ── SCROLL MODE ── single page, overflow scroll, zoom ── */
                <div
                    ref={scrollRef}
                    className="min-h-0 flex-1 overflow-auto bg-[#1a1a1a]"
                >
                    {status === "loading" && (
                        <div className="flex h-full flex-col items-center justify-center gap-3">
                            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                            <span className="text-[13px] text-white/40">{loadMsg}</span>
                        </div>
                    )}
                    {status === "error" && (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-sm text-red-400/80">Не удалось загрузить PDF</p>
                        </div>
                    )}
                    {status === "ready" && (
                        <div className="flex min-h-full justify-center py-6">
                            <canvas
                                ref={leftRef}
                                style={{
                                    display: "block",
                                    borderRadius: 3,
                                    boxShadow: "0 8px 40px rgba(0,0,0,0.8)",
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── Navigation bar ── */}
            {status === "ready" && totalPages > 0 && (
                <div
                    className="flex shrink-0 items-center justify-between border-t border-white/8 bg-[#0E1117]/95 px-6"
                    style={{ height: NAV_H }}
                >
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={!canGoPrev}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-[12px] font-semibold text-white/80 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Назад
                    </button>

                    <div className="flex flex-col items-center gap-1.5">
                        <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        <span className="text-[10px] tabular-nums text-white/30">{percent}%</span>
                    </div>

                    <button
                        type="button"
                        onClick={goNext}
                        disabled={!canGoNext}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-[12px] font-semibold text-white/80 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
                    >
                        Вперёд
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
