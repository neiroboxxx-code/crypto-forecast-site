"use client";

import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
    type TouchEvent as ReactTouchEvent,
} from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import type { AcademyCategoryId, AcademyCategoryPayload, AcademyCoursePayload } from "@/lib/academy/types";

/** Дискретные уровни масштаба (кнопки + / −). */
const ZOOM_LEVELS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3, 3.5, 4] as const;

function clampPan(
    pan: { x: number; y: number },
    vw: number,
    vh: number,
    img: HTMLImageElement,
    zoom: number,
): { x: number; y: number } {
    if (zoom <= 1) return { x: 0, y: 0 };
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    if (!w || !h) return pan;
    const mw = Math.max(0, (w * zoom - vw) / 2);
    const mh = Math.max(0, (h * zoom - vh) / 2);
    return {
        x: Math.min(mw, Math.max(-mw, pan.x)),
        y: Math.min(mh, Math.max(-mh, pan.y)),
    };
}

type Props = {
    categories: AcademyCategoryPayload[];
};

export function AcademyDashboard({ categories }: Props) {
    const [activeTab, setActiveTab] = useState<AcademyCategoryId>(
        () => categories[0]?.id ?? "technical",
    );
    const [viewer, setViewer] = useState<{ title: string; slides: string[]; index: number } | null>(null);
    const [zoomIndex, setZoomIndex] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const viewportRef = useRef<HTMLDivElement>(null);
    const slideImgRef = useRef<HTMLImageElement>(null);
    const dragLastRef = useRef({ x: 0, y: 0 });
    const titleId = useId();

    const zoom = ZOOM_LEVELS[zoomIndex] ?? 1;

    const activeCategory = categories.find((c) => c.id === activeTab) ?? categories[0];

    const openViewer = useCallback((course: AcademyCoursePayload) => {
        if (!course.slidePaths.length) return;
        setZoomIndex(0);
        setPan({ x: 0, y: 0 });
        setViewer({ title: course.title, slides: course.slidePaths, index: 0 });
    }, []);

    const closeViewer = useCallback(() => {
        setZoomIndex(0);
        setPan({ x: 0, y: 0 });
        setDragging(false);
        setViewer(null);
    }, []);

    const zoomIn = useCallback(() => {
        setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
    }, []);

    const zoomOut = useCallback(() => {
        setZoomIndex((i) => {
            const ni = Math.max(0, i - 1);
            return ni;
        });
    }, []);

    const goPrev = useCallback(() => {
        setViewer((v) => {
            if (!v) return v;
            return { ...v, index: (v.index - 1 + v.slides.length) % v.slides.length };
        });
    }, []);

    const goNext = useCallback(() => {
        setViewer((v) => {
            if (!v) return v;
            return { ...v, index: (v.index + 1) % v.slides.length };
        });
    }, []);

    useEffect(() => {
        if (!viewer) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeViewer();
            if (e.key === "ArrowLeft") goPrev();
            if (e.key === "ArrowRight") goNext();
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [viewer, closeViewer, goPrev, goNext]);

    useEffect(() => {
        if (!viewer) return;
        setZoomIndex(0);
        setPan({ x: 0, y: 0 });
    }, [viewer, viewer?.index]);

    useLayoutEffect(() => {
        if (zoomIndex === 0) {
            setPan((p) => (p.x === 0 && p.y === 0 ? p : { x: 0, y: 0 }));
            return;
        }
        const img = slideImgRef.current;
        const vp = viewportRef.current;
        if (!img || !vp) return;
        const z = ZOOM_LEVELS[zoomIndex] ?? 1;
        setPan((p) => {
            const n = clampPan(p, vp.clientWidth, vp.clientHeight, img, z);
            if (n.x === p.x && n.y === p.y) return p;
            return n;
        });
    }, [zoomIndex]);

    useEffect(() => {
        if (!dragging) return;
        const applyDelta = (dx: number, dy: number) => {
            setPan((p) => {
                const img = slideImgRef.current;
                const vp = viewportRef.current;
                if (!img || !vp) return { x: p.x + dx, y: p.y + dy };
                const z = ZOOM_LEVELS[zoomIndex] ?? 1;
                return clampPan({ x: p.x + dx, y: p.y + dy }, vp.clientWidth, vp.clientHeight, img, z);
            });
        };
        const onMove = (e: MouseEvent) => {
            const dx = e.clientX - dragLastRef.current.x;
            const dy = e.clientY - dragLastRef.current.y;
            dragLastRef.current = { x: e.clientX, y: e.clientY };
            applyDelta(dx, dy);
        };
        const onUp = () => setDragging(false);
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 1) return;
            const t = e.touches[0];
            const dx = t.clientX - dragLastRef.current.x;
            const dy = t.clientY - dragLastRef.current.y;
            dragLastRef.current = { x: t.clientX, y: t.clientY };
            applyDelta(dx, dy);
        };
        const onTouchEnd = () => setDragging(false);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [dragging, zoomIndex]);

    const onSlideMouseDown = useCallback(
        (e: ReactMouseEvent<HTMLImageElement>) => {
            if (zoom <= 1 || e.button !== 0) return;
            e.preventDefault();
            dragLastRef.current = { x: e.clientX, y: e.clientY };
            setDragging(true);
        },
        [zoom],
    );

    const onSlideTouchStart = useCallback(
        (e: ReactTouchEvent<HTMLImageElement>) => {
            if (zoom <= 1 || e.touches.length !== 1) return;
            const t = e.touches[0];
            dragLastRef.current = { x: t.clientX, y: t.clientY };
            setDragging(true);
        },
        [zoom],
    );

    const onSlideImgLoad = useCallback(() => {
        const img = slideImgRef.current;
        const vp = viewportRef.current;
        if (!img || !vp || zoomIndex === 0) return;
        const z = ZOOM_LEVELS[zoomIndex] ?? 1;
        setPan((p) => {
            const n = clampPan(p, vp.clientWidth, vp.clientHeight, img, z);
            if (n.x === p.x && n.y === p.y) return p;
            return n;
        });
    }, [zoomIndex]);

    return (
        <>
            {/* ── Tab bar ── */}
            <div className="rounded-xl border border-white/8 bg-[#0E1117]/80 p-1">
                <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categories.map((cat) => {
                        const active = cat.id === activeTab;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex shrink-0 flex-col rounded-lg px-2.5 py-1.5 text-left transition sm:px-3 sm:py-2 ${
                                    active
                                        ? "border border-cyan-400/35 bg-cyan-400/10 text-cyan-50"
                                        : "border border-transparent text-white/50 hover:border-white/10 hover:bg-white/5 hover:text-white/85"
                                }`}
                            >
                                <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em]">
                                    {cat.label}
                                </span>
                                <span
                                    className={`mt-0.5 hidden text-[10px] sm:block ${
                                        active ? "text-cyan-200/60" : "text-white/35"
                                    }`}
                                >
                                    {cat.hint}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Active section ── */}
            {activeCategory && (
                <section aria-labelledby={`academy-${activeCategory.id}`}>
                    <header className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                        <div className="min-w-0">
                            <h2
                                id={`academy-${activeCategory.id}`}
                                className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60"
                            >
                                {activeCategory.label}
                            </h2>
                            <p className="mt-0.5 text-[10px] text-white/35">{activeCategory.hint}</p>
                        </div>
                        <div className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                            {activeCategory.courses.length}&nbsp;
                            {activeCategory.courses.length === 1
                                ? "урок"
                                : activeCategory.courses.length < 5
                                  ? "урока"
                                  : "уроков"}
                        </div>
                    </header>

                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {activeCategory.courses.map((course, idx) => (
                            <CompactCourseCard
                                key={course.folder}
                                course={course}
                                onOpen={() => openViewer(course)}
                                eager={idx < 6}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* ── Lightbox ── */}
            {viewer && (
                <div
                    className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/88 backdrop-blur-sm"
                    role="presentation"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) closeViewer();
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        className="flex w-full max-w-7xl flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0B0D12]/95 px-3 py-2.5 sm:px-4">
                            <div className="min-w-0 flex-1">
                                <div id={titleId} className="truncate text-sm font-semibold text-white">
                                    {viewer.title}
                                </div>
                                <div className="text-[10px] tabular-nums text-white/45">
                                    Слайд {viewer.index + 1} из {viewer.slides.length}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={closeViewer}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-white/80 transition hover:border-white/25 hover:text-white"
                                aria-label="Закрыть"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Image area — zoom + pan */}
                        <div
                            ref={viewportRef}
                            className={`relative flex min-h-0 flex-1 overflow-hidden bg-black ${
                                zoom > 1 ? (dragging ? "cursor-grabbing touch-none" : "cursor-grab touch-none") : ""
                            }`}
                        >
                            <div className="flex h-full min-h-0 w-full items-center justify-center">
                                <div
                                    style={{
                                        transform: `translate(${pan.x}px, ${pan.y}px)`,
                                    }}
                                >
                                    <img
                                        ref={slideImgRef}
                                        key={viewer.slides[viewer.index]}
                                        src={viewer.slides[viewer.index]}
                                        alt={`Слайд ${viewer.index + 1}`}
                                        className="max-w-full object-contain select-none"
                                        style={{
                                            maxHeight: "calc(100vh - 96px)",
                                            transform: `scale(${zoom})`,
                                            transformOrigin: "center center",
                                        }}
                                        draggable={false}
                                        onMouseDown={onSlideMouseDown}
                                        onTouchStart={onSlideTouchStart}
                                        onLoad={onSlideImgLoad}
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={goPrev}
                                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white shadow-xl backdrop-blur transition hover:border-cyan-400/40 hover:bg-cyan-400/15 pointer-events-auto"
                                aria-label="Предыдущий слайд"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>

                            <button
                                type="button"
                                onClick={goNext}
                                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white shadow-xl backdrop-blur transition hover:border-cyan-400/40 hover:bg-cyan-400/15 pointer-events-auto"
                                aria-label="Следующий слайд"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Footer: слайды + масштаб */}
                        <div className="flex shrink-0 flex-col gap-2 border-t border-white/10 bg-[#0B0D12]/95 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                            <div className="flex items-center justify-between gap-2 sm:justify-start">
                                <button
                                    type="button"
                                    onClick={goPrev}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/90 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 sm:px-4"
                                    aria-label="Предыдущий слайд"
                                >
                                    <ChevronLeft className="h-4 w-4 shrink-0" />
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    onClick={goNext}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/90 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 sm:px-4"
                                    aria-label="Следующий слайд"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                </button>
                            </div>

                            <div className="flex items-center justify-center gap-2 sm:flex-1">
                                <button
                                    type="button"
                                    onClick={zoomOut}
                                    disabled={zoomIndex <= 0}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-white/90 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 disabled:pointer-events-none disabled:opacity-35"
                                    aria-label="Уменьшить"
                                    title="Уменьшить"
                                >
                                    <Minus className="h-4 w-4" aria-hidden />
                                </button>
                                <span className="min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-white/80">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={zoomIn}
                                    disabled={zoomIndex >= ZOOM_LEVELS.length - 1}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 bg-white/5 text-white/90 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 disabled:pointer-events-none disabled:opacity-35"
                                    aria-label="Увеличить"
                                    title="Увеличить"
                                >
                                    <Plus className="h-4 w-4" aria-hidden />
                                </button>
                            </div>

                            <p className="text-center text-[10px] leading-snug text-white/40 sm:max-w-[14rem] sm:text-left">
                                ← → слайды · Esc закрыть
                                {zoom > 1 ? " · при увеличении перетаскивайте снимок мышью" : " · + и − масштаб"}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function CompactCourseCard({
    course,
    onOpen,
    eager,
}: {
    course: AcademyCoursePayload;
    onOpen: () => void;
    eager?: boolean;
}) {
    const count = course.slidePaths.length;
    const thumb = course.slidePaths[0];
    const disabled = count === 0;

    return (
        <button
            type="button"
            onClick={onOpen}
            disabled={disabled}
            className={`group flex flex-col overflow-hidden rounded-lg border border-white/8 bg-[#0E1117]/90 text-left transition ${
                disabled
                    ? "cursor-not-allowed opacity-45"
                    : "hover:border-cyan-400/30 hover:bg-cyan-400/[0.05]"
            }`}
        >
            <div className="relative aspect-[5/3] w-full bg-black/40">
                {thumb ? (
                    <Image
                        src={thumb}
                        alt=""
                        fill
                        className="object-cover opacity-88 transition group-hover:opacity-100"
                        sizes="(max-width: 640px) 50vw, 20vw"
                        unoptimized
                        priority={Boolean(eager)}
                        loading={eager ? "eager" : "lazy"}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] leading-tight text-white/35">
                        Нет slide-*.jpg / .png
                    </div>
                )}
                <span className="absolute right-1 top-1 rounded border border-white/10 bg-black/60 px-1 py-px text-[9px] font-medium tabular-nums text-white/80 backdrop-blur">
                    {count}
                </span>
            </div>
            <div className="px-1.5 py-1">
                <div className="line-clamp-2 text-sm font-semibold leading-tight text-white">{course.title}</div>
                <div className="mt-0.5 text-[9px] uppercase tracking-wider text-white/35">
                    {disabled ? "—" : "Открыть"}
                </div>
            </div>
        </button>
    );
}
