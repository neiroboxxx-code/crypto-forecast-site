"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/lib/library/books";
import type { BookProgress } from "@/lib/library/progress";
import { fetchAllProgress, bookFileUrl } from "@/lib/library/progress";
import { PdfReader } from "@/components/library/pdf-reader";

// ── Book spine ────────────────────────────────────────────────────────────────

function BookSpine({
    book,
    progress,
    onClick,
}: {
    book: Book;
    progress?: BookProgress;
    onClick: () => void;
}) {
    const percent = progress?.percent ?? 0;
    const page = progress?.page;
    const totalPages = progress?.total_pages;

    const displayTitle = book.subtitle
        ? `${book.title}: ${book.subtitle}`
        : book.title;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex flex-col items-center gap-3"
        >
            {/* 3D book spine */}
            <div
                className="relative flex flex-col items-center justify-between overflow-hidden rounded-sm transition-all duration-300 ease-out group-hover:scale-105 group-hover:brightness-110"
                style={{
                    width: 44,
                    height: 220,
                    backgroundColor: book.spineColor,
                    transform: "perspective(600px) rotateY(-12deg)",
                    boxShadow: `
                        inset -3px 0 6px rgba(0,0,0,0.3),
                        inset 3px 0 6px rgba(255,255,255,0.08),
                        6px 6px 20px rgba(0,0,0,0.6),
                        -1px 0 0 rgba(0,0,0,0.4)
                    `,
                }}
            >
                {/* Progress fill overlay at bottom */}
                {percent > 0 && (
                    <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                        style={{
                            height: `${percent}%`,
                            background: "rgba(255,255,255,0.12)",
                            borderTop: "1px solid rgba(255,255,255,0.2)",
                        }}
                    />
                )}

                {/* Top decoration */}
                <div
                    className="w-full flex-shrink-0 pt-2"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}
                >
                    <div
                        className="mx-auto h-[2px] w-6 rounded-full"
                        style={{ background: "rgba(255,255,255,0.3)" }}
                    />
                </div>

                {/* Rotated title */}
                <div
                    className="relative z-10 flex flex-col items-center gap-1 px-1"
                    style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                        transform: "rotate(180deg)",
                        flex: 1,
                        justifyContent: "center",
                    }}
                >
                    <span
                        className="font-bold uppercase tracking-widest text-white"
                        style={{ fontSize: 10, lineHeight: 1.2, letterSpacing: "0.12em" }}
                    >
                        {displayTitle}
                    </span>
                    <span
                        className="font-medium text-white/60"
                        style={{ fontSize: 8, letterSpacing: "0.08em" }}
                    >
                        {book.author}
                    </span>
                </div>

                {/* Bottom year */}
                <div className="w-full flex-shrink-0 pb-2 text-center">
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
                        {book.year}
                    </span>
                </div>
            </div>

            {/* Shelf hover depth side */}
            <div
                className="absolute"
                style={{
                    width: 10,
                    height: 220,
                    top: 0,
                    right: -8,
                    background: `linear-gradient(to right, ${book.spineColor}cc, ${book.spineColor}44)`,
                    transform: "perspective(600px) rotateY(78deg) translateZ(0)",
                    transformOrigin: "left center",
                }}
            />

            {/* Progress label below spine */}
            <div className="flex flex-col items-center gap-0.5">
                {percent > 0 ? (
                    <>
                        <span className="text-[9px] font-semibold tabular-nums text-white/70">
                            {Math.round(percent)}%
                        </span>
                        {page && totalPages && (
                            <span className="text-[8px] text-white/35">
                                стр. {page}/{totalPages}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-[9px] text-white/30">не читалась</span>
                )}
            </div>
        </button>
    );
}

// ── Bookshelf ─────────────────────────────────────────────────────────────────

export function Bookshelf({ books }: { books: Book[] }) {
    const [progressMap,  setProgressMap]  = useState<Record<string, BookProgress>>({});
    const [openBook,     setOpenBook]     = useState<Book | null>(null);

    useEffect(() => {
        fetchAllProgress()
            .then((list) => {
                const map: Record<string, BookProgress> = {};
                for (const p of list) map[p.book_id] = p;
                setProgressMap(map);
            })
            .catch(() => {});
    }, []);

    // Refresh progress when reader closes
    const handleClose = () => {
        setOpenBook(null);
        fetchAllProgress()
            .then((list) => {
                const map: Record<string, BookProgress> = {};
                for (const p of list) map[p.book_id] = p;
                setProgressMap(map);
            })
            .catch(() => {});
    };

    return (
        <>
            {/* ── Reader overlay (PDF only for now) ── */}
            {openBook && openBook.type === "pdf" && (
                <PdfReader
                    bookId={openBook.id}
                    title={openBook.subtitle ? `${openBook.title}: ${openBook.subtitle}` : openBook.title}
                    fileUrl={bookFileUrl(openBook.id)}
                    initialPage={progressMap[openBook.id]?.page ?? 1}
                    onClose={handleClose}
                />
            )}

            {/* ── Shelf UI ── */}
            <div className="flex flex-col items-center gap-6">
                {/* Header */}
                <div className="flex w-full items-center gap-3">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
                        Библиотека
                    </span>
                    <div className="h-px flex-1 bg-white/8" />
                    <span className="text-[10px] text-white/25">{books.length} книги</span>
                </div>

                {/* Books row */}
                <div className="relative w-full">
                    <div className="flex items-end justify-center gap-4 px-8 pb-2">
                        {books.map((book) => (
                            <div key={book.id} className="relative">
                                <BookSpine
                                    book={book}
                                    progress={progressMap[book.id]}
                                    onClick={() => setOpenBook(book)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Wooden shelf plank */}
                    <div
                        className="relative mx-auto rounded"
                        style={{
                            height: 14,
                            width: "90%",
                            background: "linear-gradient(to bottom, #8B6835, #6B4E1A, #4a3510)",
                            boxShadow: "0 6px 20px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.08)",
                        }}
                    >
                        <div
                            className="absolute inset-x-0 top-0 h-[3px] rounded-t opacity-40"
                            style={{ background: "linear-gradient(to right, transparent, #c9903d, transparent)" }}
                        />
                    </div>

                    {/* Shelf shadow */}
                    <div
                        className="mx-auto mt-1 rounded-full opacity-40"
                        style={{
                            height: 8,
                            width: "80%",
                            background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)",
                            filter: "blur(4px)",
                        }}
                    />
                </div>

                <p className="text-center text-[10px] text-white/25">
                    Нажмите на книгу, чтобы начать читать
                </p>
            </div>
        </>
    );
}
