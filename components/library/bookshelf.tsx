"use client";

import { useEffect, useRef, useState } from "react";
import type { Book, BookCategory, BookCategoryMeta } from "@/lib/library/books";
import { BOOK_CATEGORIES } from "@/lib/library/books";
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
    const page      = progress?.page;
    const totalPages = progress?.total_pages;
    const displayTitle = book.subtitle ? `${book.title}: ${book.subtitle}` : book.title;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex flex-col items-center gap-2"
        >
            {/* 3D spine */}
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
                {/* Progress fill */}
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
                <div className="w-full flex-shrink-0 pt-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                    <div className="mx-auto h-[2px] w-6 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
                </div>
                {/* Rotated title */}
                <div
                    className="relative z-10 flex flex-col items-center gap-1 px-1"
                    style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", flex: 1, justifyContent: "center" }}
                >
                    <span className="font-bold uppercase tracking-widest text-white" style={{ fontSize: 10, lineHeight: 1.2, letterSpacing: "0.12em" }}>
                        {displayTitle}
                    </span>
                    <span className="font-medium text-white/60" style={{ fontSize: 8, letterSpacing: "0.08em" }}>
                        {book.author}
                    </span>
                </div>
                {/* Year */}
                <div className="w-full flex-shrink-0 pb-2 text-center">
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>{book.year}</span>
                </div>
            </div>

            {/* Depth side */}
            <div
                className="absolute"
                style={{
                    width: 10, height: 220, top: 0, right: -8,
                    background: `linear-gradient(to right, ${book.spineColor}cc, ${book.spineColor}44)`,
                    transform: "perspective(600px) rotateY(78deg) translateZ(0)",
                    transformOrigin: "left center",
                }}
            />

            {/* Progress label */}
            <div className="flex flex-col items-center gap-0.5">
                {percent > 0 ? (
                    <>
                        <span className="text-[9px] font-semibold tabular-nums text-white/70">{Math.round(percent)}%</span>
                        {page && totalPages && (
                            <span className="text-[8px] text-white/35">стр. {page}/{totalPages}</span>
                        )}
                    </>
                ) : (
                    <span className="text-[9px] text-white/30">не читалась</span>
                )}
            </div>
        </button>
    );
}

// ── Wooden shelf ──────────────────────────────────────────────────────────────

function WoodenShelf() {
    return (
        <div className="mt-1 flex flex-col gap-1">
            <div
                className="relative w-full rounded"
                style={{
                    height: 12,
                    background: "linear-gradient(to bottom, #8B6835, #6B4E1A, #4a3510)",
                    boxShadow: "0 5px 16px rgba(0,0,0,0.55), inset 0 1px 2px rgba(255,255,255,0.08)",
                }}
            >
                <div
                    className="absolute inset-x-0 top-0 h-[3px] rounded-t opacity-40"
                    style={{ background: "linear-gradient(to right, transparent, #c9903d, transparent)" }}
                />
            </div>
            <div
                className="mx-auto rounded-full opacity-35"
                style={{ height: 6, width: "95%", background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)", filter: "blur(3px)" }}
            />
        </div>
    );
}

// ── Category row ──────────────────────────────────────────────────────────────

function CategoryRow({
    meta,
    books,
    progressMap,
    onOpen,
    active,
}: {
    meta: BookCategoryMeta;
    books: Book[];
    progressMap: Record<string, BookProgress>;
    onOpen: (book: Book) => void;
    active: boolean;
}) {
    if (books.length === 0) return null;

    return (
        <div id={`shelf-cat-${meta.id}`} className="flex flex-col">
            {/* Category header */}
            <div className="mb-3 flex items-center gap-2">
                <span className="text-base">{meta.emoji}</span>
                <span className="text-[12px] font-semibold tracking-wide text-white/70">{meta.label}</span>
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-[9px] text-white/25">{books.length}</span>
            </div>

            {/* Horizontal scrollable books row */}
            <div
                className="flex items-end gap-3 overflow-x-auto pb-1 pl-1 pr-4"
                style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(255,255,255,0.08) transparent",
                }}
            >
                {books.map((book) => (
                    <div key={book.id} className="relative flex-shrink-0">
                        <BookSpine
                            book={book}
                            progress={progressMap[book.id]}
                            onClick={() => onOpen(book)}
                        />
                    </div>
                ))}
            </div>

            <WoodenShelf />
        </div>
    );
}

// ── Bookshelf ─────────────────────────────────────────────────────────────────

export function Bookshelf({ books }: { books: Book[] }) {
    const [progressMap, setProgressMap] = useState<Record<string, BookProgress>>({});
    const [openBook,    setOpenBook]    = useState<Book | null>(null);
    const [activeCategory, setActiveCategory] = useState<BookCategory | null>(null);

    // Group books by category
    const byCategory: Record<BookCategory, Book[]> = {
        trading: [], psychology: [], journals: [], finance: [], philosophy: [],
    };
    for (const b of books) byCategory[b.category].push(b);

    // Categories that actually have books
    const filledCategories = BOOK_CATEGORIES.filter((c) => byCategory[c.id].length > 0);

    useEffect(() => {
        fetchAllProgress()
            .then((list) => {
                const map: Record<string, BookProgress> = {};
                for (const p of list) map[p.book_id] = p;
                setProgressMap(map);
            })
            .catch(() => {});
    }, []);

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

    // Scroll to category section
    const scrollToCategory = (id: BookCategory) => {
        setActiveCategory(id);
        const el = document.getElementById(`shelf-cat-${id}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <>
            {/* Reader overlay */}
            {openBook && openBook.type === "pdf" && (
                <PdfReader
                    bookId={openBook.id}
                    title={openBook.subtitle ? `${openBook.title}: ${openBook.subtitle}` : openBook.title}
                    fileUrl={bookFileUrl(openBook.id)}
                    initialPage={progressMap[openBook.id]?.page ?? 1}
                    onClose={handleClose}
                />
            )}

            <div className="flex flex-col gap-5">
                {/* ── Header ── */}
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
                        Библиотека
                    </span>
                    <div className="h-px flex-1 bg-white/8" />
                    <span className="text-[10px] text-white/25">{books.length} книг</span>
                </div>

                {/* ── Category pills ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {BOOK_CATEGORIES.map((cat) => {
                        const count = byCategory[cat.id].length;
                        const isActive = activeCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => count > 0 && scrollToCategory(cat.id)}
                                disabled={count === 0}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition
                                    ${isActive
                                        ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-400"
                                        : count > 0
                                            ? "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white/90"
                                            : "border-white/6 bg-transparent text-white/20 cursor-default"
                                    }`}
                            >
                                <span>{cat.emoji}</span>
                                <span>{cat.label}</span>
                                {count > 0 && (
                                    <span className={`rounded-full px-1 text-[9px] tabular-nums ${isActive ? "bg-cyan-400/20 text-cyan-400" : "bg-white/10 text-white/40"}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Divider ── */}
                <div className="h-px bg-white/6" />

                {/* ── Category sections ── */}
                <div className="flex flex-col gap-10">
                    {filledCategories.map((cat) => (
                        <CategoryRow
                            key={cat.id}
                            meta={cat}
                            books={byCategory[cat.id]}
                            progressMap={progressMap}
                            onOpen={setOpenBook}
                            active={activeCategory === cat.id}
                        />
                    ))}
                </div>

                {filledCategories.length === 0 && (
                    <p className="py-8 text-center text-[12px] text-white/25">
                        Библиотека пуста — добавьте первую книгу
                    </p>
                )}
            </div>
        </>
    );
}
