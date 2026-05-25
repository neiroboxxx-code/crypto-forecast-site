"use client";

/**
 * PDF Reader — fullscreen overlay, two view modes:
 *
 *  "spread" — two-page book spread, centered, fits the screen.
 *             ←/→ buttons, navigation by 2 pages.
 *
 *  "scroll" — all pages stacked vertically, continuous scroll.
 *             Left sidebar with thumbnails (progressive background render).
 *             Click thumbnail → main area scrolls to that page.
 *             Zoom +/− buttons (50–400 %).
 *             No prev/next buttons — pure scroll.
 */

import { useCallback, useEffect, useRef, useState } from "react";
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

// ── Layout constants ──────────────────────────────────────────────────────────
const HEADER_H  = 48;
const NAV_H     = 52;
const PAD_V     = 20;
const PAD_H     = 48;
const SIDEBAR_W = 192;
const THUMB_SCALE = 0.3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcSpreadScale(vpW: number, vpH: number, pdfW: number, pdfH: number, twoPages: boolean): number {
    const availH = vpH - HEADER_H - NAV_H - PAD_V;
    const availW = twoPages ? (vpW - PAD_H) / 2 - 8 : vpW - PAD_H;
    return Math.min(availW / pdfW, availH / pdfH, 2.5);
}

function calcScrollScale(containerW: number, pdfW: number, zoom: number): number {
    return Math.min((containerW - PAD_H) / pdfW * zoom, 5);
}

async function renderPageToCanvas(pdfDoc: any, pageNum: number, canvas: HTMLCanvasElement, scale: number) {
    const pdfPage = await pdfDoc.getPage(pageNum);
    const dpr = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
    const vp   = pdfPage.getViewport({ scale: scale * dpr });
    const ctx  = canvas.getContext("2d")!;
    canvas.width  = vp.width;
    canvas.height = vp.height;
    canvas.style.width  = `${vp.width  / dpr}px`;
    canvas.style.height = `${vp.height / dpr}px`;
    await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PdfReader({ bookId, title, fileUrl, initialPage = 1, onClose }: PdfReaderProps) {

    // ─── Common ───────────────────────────────────────────────────────────────
    const pdfRef    = useRef<any>(null);
    const [status,     setStatus]     = useState<"loading" | "ready" | "error">("loading");
    const [loadMsg,    setLoadMsg]    = useState("Загрузка…");
    const [totalPages, setTotalPages] = useState(0);
    const [viewMode,   setViewMode]   = useState<ViewMode>("spread");

    // ─── Spread mode ──────────────────────────────────────────────────────────
    const leftRef        = useRef<HTMLCanvasElement>(null);
    const rightRef       = useRef<HTMLCanvasElement>(null);
    const spreadRenderGen = useRef(0);
    const normalise = (p: number) => (p % 2 === 0 ? Math.max(1, p - 1) : p);
    const [leftPage, setLeftPage] = useState(() => normalise(initialPage));

    // ─── Scroll mode ──────────────────────────────────────────────────────────
    const [zoomLevel,      setZoomLevel]      = useState(1);
    const [currentPage,    setCurrentPage]    = useState(initialPage);
    const [thumbs,         setThumbs]         = useState<Map<number, string>>(new Map());
    const [pageNativeSize, setPageNativeSize] = useState<{ w: number; h: number } | null>(null);

    const scrollContainerRef  = useRef<HTMLDivElement>(null);
    const sidebarRef          = useRef<HTMLDivElement>(null);
    const pageRefs            = useRef<Map<number, HTMLDivElement>>(new Map());
    const canvasRefs          = useRef<Map<number, HTMLCanvasElement>>(new Map());
    const renderedPages       = useRef<Set<number>>(new Set());
    const scrollRenderGen     = useRef(0);
    const thumbStopRef        = useRef(false);
    const saveScrollTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingScrollPage   = useRef<number | null>(null);

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

    // ── Get native page size (for scroll mode placeholders) ───────────────────
    useEffect(() => {
        if (status !== "ready" || !pdfRef.current) return;
        pdfRef.current.getPage(1).then((page: any) => {
            const vp = page.getViewport({ scale: 1 });
            setPageNativeSize({ w: vp.width, h: vp.height });
        }).catch(() => {});
    }, [status]);

    // ── SPREAD: render pages ──────────────────────────────────────────────────
    useEffect(() => {
        if (viewMode !== "spread" || status !== "ready" || !pdfRef.current) return;
        const gen = ++spreadRenderGen.current;

        async function render() {
            const pdf   = pdfRef.current;
            const total = pdf.numPages;
            const right = leftPage + 1;
            const twoP  = right <= total;

            const refPage  = await pdf.getPage(leftPage);
            const nativeVp = refPage.getViewport({ scale: 1 });
            const scale    = calcSpreadScale(window.innerWidth, window.innerHeight, nativeVp.width, nativeVp.height, twoP);

            if (gen !== spreadRenderGen.current) return;
            if (leftRef.current) await renderPageToCanvas(pdf, leftPage, leftRef.current, scale);
            if (gen !== spreadRenderGen.current) return;

            if (twoP && rightRef.current) {
                await renderPageToCanvas(pdf, right, rightRef.current, scale);
            } else if (rightRef.current) {
                rightRef.current.width = 0; rightRef.current.height = 0;
            }

            if (gen !== spreadRenderGen.current) return;
            const pct = Math.round((leftPage / total) * 100);
            saveProgress({ book_id: bookId, page: leftPage, total_pages: total, percent: pct });
        }
        render();
    }, [leftPage, status, bookId, viewMode]);

    // ── SPREAD: resize ────────────────────────────────────────────────────────
    useEffect(() => {
        if (status !== "ready" || viewMode !== "spread") return;
        let timer: ReturnType<typeof setTimeout>;
        const onResize = () => { clearTimeout(timer); timer = setTimeout(() => setLeftPage((p) => p), 200); };
        window.addEventListener("resize", onResize);
        return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
    }, [status, viewMode]);

    // ── Scroll to pending page after mode switch ──────────────────────────────
    useEffect(() => {
        if (viewMode !== "scroll" || pendingScrollPage.current === null) return;
        const target = pendingScrollPage.current;
        // Wait for scroll DOM + page placeholders to render
        const timer = setTimeout(() => {
            scrollToPage(target);
            pendingScrollPage.current = null;
        }, 250);
        return () => clearTimeout(timer);
    }, [viewMode, scrollToPage]);

    // ── SCROLL: lazy page rendering via IntersectionObserver ──────────────────
    useEffect(() => {
        if (viewMode !== "scroll" || status !== "ready" || !pageNativeSize) return;

        renderedPages.current.clear();
        const gen = ++scrollRenderGen.current;

        function renderPage(pageNum: number) {
            const canvas = canvasRefs.current.get(pageNum);
            if (!canvas || renderedPages.current.has(pageNum)) return;
            renderedPages.current.add(pageNum);

            const containerW = scrollContainerRef.current?.clientWidth ?? (window.innerWidth - SIDEBAR_W);
            const scale = calcScrollScale(containerW, pageNativeSize!.w, zoomLevel);

            renderPageToCanvas(pdfRef.current, pageNum, canvas, scale).catch(() => {
                renderedPages.current.delete(pageNum); // allow retry
            });
        }

        const container = scrollContainerRef.current;
        const observer = new IntersectionObserver((entries) => {
            if (scrollRenderGen.current !== gen) return;
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const p = parseInt(entry.target.getAttribute("data-page") || "0");
                    if (p > 0) renderPage(p);
                }
            }
        }, { root: container, rootMargin: "1200px 0px" });

        // Observe all page placeholder divs
        pageRefs.current.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [viewMode, status, pageNativeSize, zoomLevel]);

    // ── SCROLL: track current visible page ────────────────────────────────────
    useEffect(() => {
        if (viewMode !== "scroll" || status !== "ready" || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;

        const observer = new IntersectionObserver((entries) => {
            let bestPage = 0, bestRatio = 0;
            for (const entry of entries) {
                if (entry.intersectionRatio > bestRatio) {
                    bestRatio = entry.intersectionRatio;
                    const p = parseInt(entry.target.getAttribute("data-page") || "0");
                    if (p > 0) bestPage = p;
                }
            }
            if (bestPage > 0) {
                setCurrentPage(bestPage);
                if (saveScrollTimer.current) clearTimeout(saveScrollTimer.current);
                saveScrollTimer.current = setTimeout(() => {
                    const pct = Math.round((bestPage / totalPages) * 100);
                    saveProgress({ book_id: bookId, page: bestPage, total_pages: totalPages, percent: pct });
                }, 2000);
            }
        }, { root: container, threshold: [0, 0.1, 0.25, 0.5, 1] });

        // Small delay to ensure refs are populated after render
        const timer = setTimeout(() => {
            pageRefs.current.forEach((el) => observer.observe(el));
        }, 60);

        return () => { clearTimeout(timer); observer.disconnect(); };
    }, [viewMode, status, totalPages, bookId]);

    // ── SCROLL: background thumbnail rendering ────────────────────────────────
    useEffect(() => {
        if (status !== "ready" || viewMode !== "scroll") return;
        let stopped = false;
        thumbStopRef.current = false;

        async function renderThumbs() {
            const pdf = pdfRef.current;
            for (let p = 1; p <= pdf.numPages; p++) {
                if (stopped) return;
                try {
                    const page = await pdf.getPage(p);
                    const dpr  = (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1;
                    const vp   = page.getViewport({ scale: THUMB_SCALE * dpr });
                    const c    = document.createElement("canvas");
                    c.width = vp.width; c.height = vp.height;
                    await page.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
                    const url = c.toDataURL("image/jpeg", 0.82);
                    setThumbs((prev) => { const m = new Map(prev); m.set(p, url); return m; });
                } catch { /* skip bad page */ }
                await new Promise((r) => setTimeout(r, 12)); // yield to browser
            }
        }

        renderThumbs();
        return () => { stopped = true; thumbStopRef.current = true; };
    }, [status, viewMode]);

    // ── SCROLL: auto-scroll sidebar to current page ───────────────────────────
    useEffect(() => {
        if (!sidebarRef.current) return;
        const el = sidebarRef.current.querySelector(`[data-thumb="${currentPage}"]`) as HTMLElement | null;
        if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [currentPage]);

    // ── Keyboard ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { onClose(); return; }
            if (viewMode === "spread") {
                if (e.key === "ArrowLeft"  || e.key === "PageUp")
                    setLeftPage((p) => normalise(Math.max(1, p - 2)));
                if (e.key === "ArrowRight" || e.key === "PageDown")
                    setLeftPage((p) => normalise(Math.min(totalPages, p + 2)));
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "=") {
                e.preventDefault();
                setZoomLevel((z) => Math.min(4, +(z + 0.25).toFixed(2)));
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "-") {
                e.preventDefault();
                setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [totalPages, onClose, viewMode]);

    // ── Callback refs ─────────────────────────────────────────────────────────
    const setPageRef = useCallback((el: HTMLDivElement | null, p: number) => {
        if (el) pageRefs.current.set(p, el); else pageRefs.current.delete(p);
    }, []);
    const setCanvasRef = useCallback((el: HTMLCanvasElement | null, p: number) => {
        if (el) canvasRefs.current.set(p, el); else canvasRefs.current.delete(p);
    }, []);

    const scrollToPage = useCallback((pageNum: number) => {
        const el = pageRefs.current.get(pageNum);
        if (el && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
        }
    }, []);

    // ── Spread nav ────────────────────────────────────────────────────────────
    const goPrev = () => setLeftPage((p) => normalise(Math.max(1, p - 2)));
    const goNext = () => setLeftPage((p) => normalise(Math.min(totalPages, p + 2)));

    const rightPage = leftPage + 1;
    const hasRight  = viewMode === "spread" && rightPage <= totalPages;
    const displayPage = viewMode === "spread" ? leftPage : currentPage;
    const percent = totalPages > 0 ? Math.round((displayPage / totalPages) * 100) : 0;

    // ── Scroll mode: page placeholder dimensions ──────────────────────────────
    const containerW = typeof window !== "undefined" ? window.innerWidth - SIDEBAR_W : 800;
    const displayW   = pageNativeSize ? Math.floor((containerW - PAD_H) * zoomLevel) : 0;
    const displayH   = pageNativeSize ? Math.floor(displayW * (pageNativeSize.h / pageNativeSize.w)) : 0;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[999] flex flex-col bg-[#0B0D12]">

            {/* ── Header ── */}
            <div
                className="flex shrink-0 items-center gap-2 border-b border-white/8 bg-[#0E1117] px-4"
                style={{ height: HEADER_H }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:text-white"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    На полку
                </button>

                <div className="mx-1 h-4 w-px bg-white/10" />

                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/80">
                    {title}
                </span>

                {/* Mode toggle */}
                <div className="flex overflow-hidden rounded-md border border-white/10">
                    <button
                        type="button"
                        onClick={() => {
                            setLeftPage(normalise(currentPage)); // sync scroll→spread
                            setViewMode("spread");
                        }}
                        className={`px-3 py-1.5 text-[11px] font-medium transition ${viewMode === "spread" ? "bg-cyan-400/20 text-cyan-400" : "text-white/35 hover:text-white/70"}`}
                    >
                        Разворот
                    </button>
                    <div className="w-px bg-white/10" />
                    <button
                        type="button"
                        onClick={() => {
                            pendingScrollPage.current = leftPage; // sync spread→scroll
                            setCurrentPage(leftPage);
                            setZoomLevel(0.5); // default 50% — fits page comfortably
                            setViewMode("scroll");
                        }}
                        className={`px-3 py-1.5 text-[11px] font-medium transition ${viewMode === "scroll" ? "bg-cyan-400/20 text-cyan-400" : "text-white/35 hover:text-white/70"}`}
                    >
                        Страница
                    </button>
                </div>

                {/* Zoom — scroll mode only */}
                {viewMode === "scroll" && (
                    <div className="flex items-center gap-0.5 rounded-md border border-white/10 px-1">
                        <button
                            type="button"
                            onClick={() => setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                            className="rounded p-1.5 text-white/50 transition hover:bg-white/8 hover:text-white"
                        >
                            <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-9 text-center text-[11px] tabular-nums text-white/50">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            type="button"
                            onClick={() => setZoomLevel((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                            className="rounded p-1.5 text-white/50 transition hover:bg-white/8 hover:text-white"
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                )}

                {/* Page counter */}
                {totalPages > 0 && (
                    <span className="text-[11px] tabular-nums text-white/35">
                        {viewMode === "spread"
                            ? (hasRight ? `${leftPage}–${rightPage}` : `${leftPage}`)
                            : currentPage
                        } / {totalPages}
                    </span>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    className="ml-1 rounded-md p-1.5 text-white/30 transition hover:bg-white/8 hover:text-white/70"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* ── SPREAD MODE ── */}
            {viewMode === "spread" && (
                <>
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
                            className="flex items-stretch"
                            style={{ opacity: status === "ready" ? 1 : 0, transition: "opacity .2s" }}
                        >
                            <div className="flex items-center">
                                <canvas ref={leftRef} style={{ display: "block", borderRadius: "3px 0 0 3px", boxShadow: "4px 0 32px rgba(0,0,0,0.8)" }} />
                            </div>
                            <div style={{ width: 4, alignSelf: "stretch", background: "linear-gradient(to right,#111320,#1e2044,#111320)", boxShadow: "0 0 16px rgba(80,80,180,0.2)", flexShrink: 0 }} />
                            <div className="flex items-center">
                                {hasRight ? (
                                    <canvas ref={rightRef} style={{ display: "block", borderRadius: "0 3px 3px 0", boxShadow: "-4px 0 32px rgba(0,0,0,0.8)" }} />
                                ) : (
                                    <div style={{ width: 40, alignSelf: "stretch", borderRadius: "0 3px 3px 0", background: "#0d0d1a", opacity: 0.3 }} />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Spread nav bar */}
                    {status === "ready" && totalPages > 0 && (
                        <div
                            className="flex shrink-0 items-center justify-between border-t border-white/8 bg-[#0E1117]/95 px-6"
                            style={{ height: NAV_H }}
                        >
                            <button
                                type="button"
                                onClick={goPrev}
                                disabled={leftPage <= 1}
                                className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-[12px] font-semibold text-white/80 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Назад
                            </button>
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="h-1 w-48 overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full rounded-full bg-cyan-400 transition-all duration-300" style={{ width: `${percent}%` }} />
                                </div>
                                <span className="text-[10px] tabular-nums text-white/30">{percent}%</span>
                            </div>
                            <button
                                type="button"
                                onClick={goNext}
                                disabled={leftPage + 1 >= totalPages}
                                className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-4 py-2 text-[12px] font-semibold text-white/80 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white disabled:pointer-events-none disabled:opacity-25"
                            >
                                Вперёд
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* ── SCROLL MODE ── */}
            {viewMode === "scroll" && (
                <div className="flex min-h-0 flex-1 overflow-hidden">

                    {/* Thumbnail sidebar */}
                    <div
                        ref={sidebarRef}
                        className="flex shrink-0 flex-col gap-1.5 overflow-y-auto overflow-x-hidden border-r border-white/8 bg-[#0A0C10] py-3 px-2"
                        style={{ width: SIDEBAR_W }}
                    >
                        {status === "loading" && (
                            <div className="flex flex-1 items-center justify-center py-8">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                            </div>
                        )}
                        {status === "ready" && Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                            const isActive = p === currentPage;
                            const thumb    = thumbs.get(p);
                            const ar       = pageNativeSize ? pageNativeSize.h / pageNativeSize.w : 297 / 210;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    data-thumb={p}
                                    onClick={() => scrollToPage(p)}
                                    className={`group flex w-full flex-col items-center gap-1 rounded-md p-1.5 transition ${isActive ? "bg-cyan-400/15 ring-1 ring-cyan-400/40" : "hover:bg-white/5"}`}
                                >
                                    <div
                                        className="w-full overflow-hidden rounded-sm bg-white/5"
                                        style={{ aspectRatio: `1 / ${ar}` }}
                                    >
                                        {thumb ? (
                                            <img
                                                src={thumb}
                                                alt={`Стр. ${p}`}
                                                className="h-full w-full object-cover"
                                                draggable={false}
                                            />
                                        ) : (
                                            <div className="h-full w-full animate-pulse bg-white/10" />
                                        )}
                                    </div>
                                    <span className={`text-[9px] tabular-nums ${isActive ? "text-cyan-400 font-semibold" : "text-white/30"}`}>
                                        {p}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main scroll area */}
                    <div
                        ref={scrollContainerRef}
                        className="min-h-0 flex-1 overflow-auto bg-[#181818]"
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
                        {status === "ready" && pageNativeSize && (
                            <div className="flex flex-col items-center gap-3 py-6">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <div
                                        key={p}
                                        data-page={p}
                                        ref={(el) => setPageRef(el as HTMLDivElement, p)}
                                        style={{
                                            width:    displayW || "auto",
                                            minHeight: displayH || 400,
                                            flexShrink: 0,
                                            position: "relative",
                                        }}
                                    >
                                        <canvas
                                            ref={(el) => setCanvasRef(el as HTMLCanvasElement, p)}
                                            style={{
                                                display: "block",
                                                borderRadius: 3,
                                                boxShadow: "0 4px 24px rgba(0,0,0,0.7)",
                                            }}
                                        />
                                    </div>
                                ))}
                                {/* bottom padding */}
                                <div style={{ height: 32 }} />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
