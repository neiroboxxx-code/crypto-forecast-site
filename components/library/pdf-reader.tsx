"use client";

/**
 * PDF Reader — two-page spread, centered, full-screen height.
 * Left canvas = current page, Right canvas = current + 1.
 * Navigation jumps 2 pages at a time.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { saveProgress } from "@/lib/library/progress";

interface PdfReaderProps {
    bookId: string;
    fileUrl: string;
    initialPage?: number;
}

// Reserve px for header + nav + vertical padding
const HEADER_H = 48;
const NAV_H    = 64;
const PAD_V    = 24;
const PAD_H    = 48; // total horizontal padding for the two-page container

function calcScale(
    vpW: number,
    vpH: number,
    pdfW: number,
    pdfH: number,
    twoPages: boolean,
): number {
    const availH = vpH - HEADER_H - NAV_H - PAD_V;
    // Each page gets half the viewport width minus gutter
    const availW = twoPages ? (vpW - PAD_H) / 2 - 8 : vpW - PAD_H;
    const byW = availW / pdfW;
    const byH = availH / pdfH;
    return Math.min(byW, byH, 2.5);
}

async function renderPageToCanvas(
    pdfDoc: any,
    pageNum: number,
    canvas: HTMLCanvasElement,
    scale: number,
) {
    const pdfPage = await pdfDoc.getPage(pageNum);
    const vp = pdfPage.getViewport({ scale });
    const ctx = canvas.getContext("2d")!;
    canvas.width  = vp.width;
    canvas.height = vp.height;
    canvas.style.width  = `${vp.width}px`;
    canvas.style.height = `${vp.height}px`;
    const task = pdfPage.render({ canvasContext: ctx, viewport: vp });
    await task.promise;
}

export function PdfReader({ bookId, fileUrl, initialPage = 1 }: PdfReaderProps) {
    const leftRef  = useRef<HTMLCanvasElement>(null);
    const rightRef = useRef<HTMLCanvasElement>(null);
    const pdfRef   = useRef<any>(null);
    const renderGen = useRef(0); // generation counter to cancel stale renders

    // Always keep leftPage odd (1, 3, 5…) so spreads align like a real book
    const normalise = (p: number) => (p % 2 === 0 ? Math.max(1, p - 1) : p);
    const [leftPage, setLeftPage] = useState(() => normalise(initialPage));
    const [totalPages, setTotalPages] = useState(0);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [loadMsg, setLoadMsg] = useState("Загрузка…");

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
            const pdf    = pdfRef.current;
            const total  = pdf.numPages;
            const right  = leftPage + 1;
            const twoP   = right <= total;
            const scale  = calcScale(
                window.innerWidth,
                window.innerHeight,
                // Get native page dimensions from page 1 (assumed uniform)
                0, 0, // will override below
                twoP,
            );

            // Get actual page size from leftPage
            const refPage  = await pdf.getPage(leftPage);
            const nativeVp = refPage.getViewport({ scale: 1 });
            const finalScale = calcScale(
                window.innerWidth,
                window.innerHeight,
                nativeVp.width,
                nativeVp.height,
                twoP,
            );

            if (gen !== renderGen.current) return; // stale

            // Render left page
            if (leftRef.current) {
                await renderPageToCanvas(pdf, leftPage, leftRef.current, finalScale);
            }

            if (gen !== renderGen.current) return;

            // Render right page (if exists)
            if (twoP && rightRef.current) {
                await renderPageToCanvas(pdf, right, rightRef.current, finalScale);
            } else if (rightRef.current) {
                // Clear right canvas when no second page
                const c = rightRef.current;
                c.width = 0; c.height = 0;
            }

            if (gen !== renderGen.current) return;

            // Save progress
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
            timer = setTimeout(() => setLeftPage((p) => p), 200); // re-trigger render
        };
        window.addEventListener("resize", onResize);
        return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
    }, [status]);

    // ── Keyboard navigation ───────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft"  || e.key === "PageUp")
                setLeftPage((p) => normalise(Math.max(1, p - 2)));
            if (e.key === "ArrowRight" || e.key === "PageDown")
                setLeftPage((p) => normalise(Math.min(totalPages, p + 2)));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [totalPages]);

    const goPrev = () => setLeftPage((p) => normalise(Math.max(1, p - 2)));
    const goNext = () => setLeftPage((p) => normalise(Math.min(totalPages, p + 2)));

    const rightPage  = leftPage + 1;
    const hasRight   = rightPage <= totalPages;
    const percent    = totalPages > 0 ? Math.round((leftPage / totalPages) * 100) : 0;

    return (
        <div className="flex h-full flex-col bg-[#0B0D12]">

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
                    className="flex items-stretch gap-1"
                    style={{ opacity: status === "ready" ? 1 : 0, transition: "opacity .2s" }}
                >
                    {/* Left page */}
                    <div className="flex items-center justify-end">
                        <canvas
                            ref={leftRef}
                            className="block shadow-[4px_0_24px_rgba(0,0,0,0.7)]"
                            style={{ display: "block", borderRadius: "2px 0 0 2px" }}
                        />
                    </div>

                    {/* Spine (decorative) */}
                    <div
                        className="shrink-0 self-stretch"
                        style={{
                            width: 3,
                            background: "linear-gradient(to right, #1a1a2e, #2d2d4e, #1a1a2e)",
                            boxShadow: "0 0 12px rgba(100,100,200,0.15)",
                        }}
                    />

                    {/* Right page */}
                    <div className="flex items-center justify-start">
                        {hasRight ? (
                            <canvas
                                ref={rightRef}
                                className="block shadow-[-4px_0_24px_rgba(0,0,0,0.7)]"
                                style={{ display: "block", borderRadius: "0 2px 2px 0" }}
                            />
                        ) : (
                            // Blank right page when last page is odd
                            <div
                                className="flex items-center justify-center bg-[#0d0d1a]"
                                style={{ width: 40, alignSelf: "stretch", borderRadius: "0 2px 2px 0", opacity: 0.3 }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Navigation ── */}
            {status === "ready" && totalPages > 0 && (
                <div className="flex shrink-0 items-center justify-between border-t border-white/8 bg-[#0E1117]/95 px-6 py-3">
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
                        <span className="text-[12px] font-medium tabular-nums text-white/60">
                            {hasRight
                                ? `стр. ${leftPage}–${rightPage} из ${totalPages}`
                                : `стр. ${leftPage} из ${totalPages}`}
                        </span>
                        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
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
