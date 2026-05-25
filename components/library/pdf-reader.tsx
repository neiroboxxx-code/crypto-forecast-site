"use client";

/**
 * PDF Reader — fullscreen overlay, two-page spread, macOS Preview style.
 * Renders as position:fixed over the entire site.
 * Left canvas = current page (always odd), Right canvas = current + 1.
 * Navigation jumps 2 pages at a time.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { saveProgress } from "@/lib/library/progress";

interface PdfReaderProps {
    bookId: string;
    title: string;
    fileUrl: string;
    initialPage?: number;
    onClose: () => void;
}

// Layout constants (px)
const HEADER_H = 48;
const NAV_H    = 52;
const PAD_V    = 20;
const PAD_H    = 48; // total horizontal padding inside canvas area

function calcScale(
    vpW: number,
    vpH: number,
    pdfW: number,
    pdfH: number,
    twoPages: boolean,
): number {
    const availH = vpH - HEADER_H - NAV_H - PAD_V;
    const availW = twoPages ? (vpW - PAD_H) / 2 - 8 : vpW - PAD_H;
    return Math.min(availW / pdfW, availH / pdfH, 2.5);
}

async function renderPageToCanvas(
    pdfDoc: any,
    pageNum: number,
    canvas: HTMLCanvasElement,
    scale: number,
) {
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

export function PdfReader({ bookId, title, fileUrl, initialPage = 1, onClose }: PdfReaderProps) {
    const leftRef   = useRef<HTMLCanvasElement>(null);
    const rightRef  = useRef<HTMLCanvasElement>(null);
    const pdfRef    = useRef<any>(null);
    const renderGen = useRef(0);

    // leftPage is always odd so spreads align like a real book
    const normalise = (p: number) => (p % 2 === 0 ? Math.max(1, p - 1) : p);
    const [leftPage,   setLeftPage]   = useState(() => normalise(initialPage));
    const [totalPages, setTotalPages] = useState(0);
    const [status,     setStatus]     = useState<"loading" | "ready" | "error">("loading");
    const [loadMsg,    setLoadMsg]    = useState("Загрузка…");

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
                const pdf = await pdfjs.getDocument({
                    url: fileUrl,
                    rangeChunkSize: 65536,
                }).promise;
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

    // ── Render spread whenever leftPage / ready ───────────────────────────────
    useEffect(() => {
        if (status !== "ready" || !pdfRef.current) return;
        const gen = ++renderGen.current;

        async function render() {
            const pdf   = pdfRef.current;
            const total = pdf.numPages;
            const right = leftPage + 1;
            const twoP  = right <= total;

            const refPage    = await pdf.getPage(leftPage);
            const nativeVp   = refPage.getViewport({ scale: 1 });
            const finalScale = calcScale(
                window.innerWidth,
                window.innerHeight,
                nativeVp.width,
                nativeVp.height,
                twoP,
            );

            if (gen !== renderGen.current) return;

            if (leftRef.current)
                await renderPageToCanvas(pdf, leftPage, leftRef.current, finalScale);

            if (gen !== renderGen.current) return;

            if (twoP && rightRef.current) {
                await renderPageToCanvas(pdf, right, rightRef.current, finalScale);
            } else if (rightRef.current) {
                const c = rightRef.current;
                c.width = 0; c.height = 0;
            }

            if (gen !== renderGen.current) return;

            const pct = Math.round((leftPage / total) * 100);
            saveProgress({ book_id: bookId, page: leftPage, total_pages: total, percent: pct });
        }

        render();
    }, [leftPage, status, bookId]);

    // ── Re-render on resize ───────────────────────────────────────────────────
    useEffect(() => {
        if (status !== "ready") return;
        let timer: ReturnType<typeof setTimeout>;
        const onResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => setLeftPage((p) => p), 200);
        };
        window.addEventListener("resize", onResize);
        return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
    }, [status]);

    // ── Keyboard navigation ───────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { onClose(); return; }
            if (e.key === "ArrowLeft"  || e.key === "PageUp")
                setLeftPage((p) => normalise(Math.max(1, p - 2)));
            if (e.key === "ArrowRight" || e.key === "PageDown")
                setLeftPage((p) => normalise(Math.min(totalPages, p + 2)));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [totalPages, onClose]);

    const goPrev = () => setLeftPage((p) => normalise(Math.max(1, p - 2)));
    const goNext = () => setLeftPage((p) => normalise(Math.min(totalPages, p + 2)));

    const rightPage = leftPage + 1;
    const hasRight  = rightPage <= totalPages;
    const percent   = totalPages > 0 ? Math.round((leftPage / totalPages) * 100) : 0;

    return (
        /* ── Fullscreen overlay, covers the entire site ── */
        <div className="fixed inset-0 z-[999] flex flex-col bg-[#0B0D12]">

            {/* ── Header bar ── */}
            <div
                className="flex shrink-0 items-center gap-3 border-b border-white/8 bg-[#0E1117] px-4"
                style={{ height: HEADER_H }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:text-white"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    На полку
                </button>

                <div className="mx-1 h-4 w-px bg-white/10" />

                <span className="flex-1 truncate text-[13px] font-semibold text-white/80">
                    {title}
                </span>

                {totalPages > 0 && (
                    <span className="text-[11px] tabular-nums text-white/35">
                        {hasRight ? `стр. ${leftPage}–${rightPage}` : `стр. ${leftPage}`} из {totalPages}
                    </span>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    className="ml-2 rounded-md p-1.5 text-white/30 transition hover:bg-white/8 hover:text-white/70"
                    aria-label="Закрыть"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* ── Page spread area ── */}
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

                {/* Two-page spread */}
                <div
                    className="flex items-stretch gap-0"
                    style={{ opacity: status === "ready" ? 1 : 0, transition: "opacity .2s" }}
                >
                    {/* Left page */}
                    <div className="flex items-center justify-end">
                        <canvas
                            ref={leftRef}
                            className="block"
                            style={{
                                display: "block",
                                borderRadius: "3px 0 0 3px",
                                boxShadow: "4px 0 32px rgba(0,0,0,0.8)",
                            }}
                        />
                    </div>

                    {/* Spine */}
                    <div
                        className="shrink-0 self-stretch"
                        style={{
                            width: 4,
                            background: "linear-gradient(to right, #111320, #1e2044, #111320)",
                            boxShadow: "0 0 16px rgba(80,80,180,0.2)",
                        }}
                    />

                    {/* Right page */}
                    <div className="flex items-center justify-start">
                        {hasRight ? (
                            <canvas
                                ref={rightRef}
                                className="block"
                                style={{
                                    display: "block",
                                    borderRadius: "0 3px 3px 0",
                                    boxShadow: "-4px 0 32px rgba(0,0,0,0.8)",
                                }}
                            />
                        ) : (
                            // Blank right page when last page is odd-numbered
                            <div
                                style={{
                                    width: 40,
                                    alignSelf: "stretch",
                                    borderRadius: "0 3px 3px 0",
                                    background: "#0d0d1a",
                                    opacity: 0.3,
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Navigation bar ── */}
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
                        disabled={leftPage + 1 >= totalPages}
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
