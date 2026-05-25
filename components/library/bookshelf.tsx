"use client";

import { useEffect, useState } from "react";
import type { Book, BookCategory, BookCategoryMeta } from "@/lib/library/books";
import { BOOK_CATEGORIES } from "@/lib/library/books";
import type { BookProgress } from "@/lib/library/progress";
import { fetchAllProgress, bookFileUrl } from "@/lib/library/progress";
import { PdfReader } from "@/components/library/pdf-reader";

// ── Horizontal book spine card ────────────────────────────────────────────────
//
// Displayed like a book lying on a rack, spine facing up — horizontal layout.
// Width ~200px × Height ~68px.  Each category row scrolls horizontally.

function BookCard({
    book,
    progress,
    onClick,
}: {
    book: Book;
    progress?: BookProgress;
    onClick: () => void;
}) {
    const percent = progress?.percent ?? 0;
    const displayTitle = book.subtitle ? `${book.title}: ${book.subtitle}` : book.title;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative flex-shrink-0 overflow-hidden rounded transition-all duration-200 ease-out hover:scale-[1.04] hover:brightness-110 focus:outline-none"
            style={{
                width: 196,
                height: 64,
                backgroundColor: book.spineColor,
                boxShadow: "0 4px 18px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3)",
            }}
        >
            {/* Left binding edge */}
            <div
                className="absolute inset-y-0 left-0"
                style={{
                    width: 10,
                    background: "rgba(0,0,0,0.28)",
                    borderRight: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "inset -3px 0 6px rgba(0,0,0,0.2)",
                }}
            />

            {/* Content */}
            <div className="absolute inset-y-0 left-3 right-0 flex flex-col justify-center gap-0.5 px-3">
                <span
                    className="block overflow-hidden font-bold text-white"
                    style={{
                        fontSize: 11,
                        lineHeight: 1.25,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        letterSpacing: "0.01em",
                    }}
                >
                    {displayTitle}
                </span>
                <span className="block truncate text-white/55" style={{ fontSize: 9 }}>
                    {book.author} · {book.year}
                </span>
            </div>

            {/* Progress bar at bottom */}
            {percent > 0 && (
                <div
                    className="absolute bottom-0 left-0 h-[3px] transition-all duration-500"
                    style={{ width: `${percent}%`, background: "rgba(255,255,255,0.55)" }}
                />
            )}

            {/* Percent badge */}
            {percent > 0 && (
                <div
                    className="absolute right-1.5 bottom-1 text-white/60 tabular-nums"
                    style={{ fontSize: 8 }}
                >
                    {Math.round(percent)}%
                </div>
            )}
        </button>
    );
}

// ── Wooden shelf strip ────────────────────────────────────────────────────────

function WoodenShelf() {
    return (
        <div className="flex flex-col gap-1 pt-1">
            <div
                className="relative w-full rounded"
                style={{
                    height: 10,
                    background: "linear-gradient(to bottom, #8B6835, #6B4E1A, #4a3510)",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.08)",
                }}
            >
                <div
                    className="absolute inset-x-0 top-0 h-[2px] rounded-t opacity-40"
                    style={{ background: "linear-gradient(to right, transparent, #c9903d, transparent)" }}
                />
            </div>
            <div
                className="mx-auto rounded-full opacity-30"
                style={{
                    height: 5,
                    width: "92%",
                    background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)",
                    filter: "blur(3px)",
                }}
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
}: {
    meta: BookCategoryMeta;
    books: Book[];
    progressMap: Record<string, BookProgress>;
    onOpen: (book: Book) => void;
}) {
    if (books.length === 0) return null;

    return (
        <div id={`shelf-cat-${meta.id}`} className="flex flex-col gap-0">
            {/* Category header */}
            <div className="mb-3 flex items-center gap-2">
                <span className="text-sm">{meta.emoji}</span>
                <span className="text-[12px] font-semibold tracking-wide text-white/70">
                    {meta.label}
                </span>
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-[9px] text-white/25">{books.length}</span>
            </div>

            {/* Horizontal scrollable books row */}
            <div
                className="flex items-end gap-2 overflow-x-auto pb-0"
                style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
            >
                {books.map((book) => (
                    <BookCard
                        key={book.id}
                        book={book}
                        progress={progressMap[book.id]}
                        onClick={() => onOpen(book)}
                    />
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

    // Group books by category
    const byCategory = Object.fromEntries(
        BOOK_CATEGORIES.map((c) => [c.id, books.filter((b) => b.category === c.id)]),
    ) as Record<BookCategory, Book[]>;

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

    const scrollToCategory = (id: BookCategory) => {
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

                {/* ── Category pills (navigation only) ── */}
                <div className="flex flex-wrap items-center gap-2">
                    {BOOK_CATEGORIES.map((cat) => {
                        const count = byCategory[cat.id].length;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => count > 0 && scrollToCategory(cat.id)}
                                disabled={count === 0}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition
                                    ${count > 0
                                        ? "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/8 hover:text-white/90"
                                        : "border-white/5 bg-transparent text-white/18 cursor-default"
                                    }`}
                            >
                                <span>{cat.emoji}</span>
                                <span>{cat.label}</span>
                                {count > 0 && (
                                    <span className="rounded-full bg-white/10 px-1 text-[9px] tabular-nums text-white/40">
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="h-px bg-white/6" />

                {/* ── Category sections — all visible at once ── */}
                <div className="flex flex-col gap-9">
                    {filledCategories.map((cat) => (
                        <CategoryRow
                            key={cat.id}
                            meta={cat}
                            books={byCategory[cat.id]}
                            progressMap={progressMap}
                            onOpen={setOpenBook}
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
