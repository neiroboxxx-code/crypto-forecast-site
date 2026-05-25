"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { BOOKS_BY_ID } from "@/lib/library/books";
import { fetchAllProgress, bookFileUrl } from "@/lib/library/progress";
import type { BookProgress } from "@/lib/library/progress";
import { PdfReader } from "@/components/library/pdf-reader";
import { EpubReader } from "@/components/library/epub-reader";

export default function LibraryReaderPage() {
    const params = useParams();
    const router = useRouter();
    const bookId = params.bookId as string;
    const book = BOOKS_BY_ID[bookId];

    const [progress, setProgress] = useState<BookProgress | null>(null);
    const [progressLoaded, setProgressLoaded] = useState(false);

    // Load saved progress on mount
    useEffect(() => {
        if (!book) return;
        fetchAllProgress()
            .then((list) => {
                const found = list.find((p) => p.book_id === bookId);
                setProgress(found ?? null);
            })
            .catch(() => {})
            .finally(() => setProgressLoaded(true));
    }, [book, bookId]);

    if (!book) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0B0D12]">
                <BookOpen className="h-12 w-12 text-white/20" />
                <p className="text-sm text-white/40">Книга не найдена</p>
                <button
                    type="button"
                    onClick={() => router.push("/academy")}
                    className="text-xs text-cyan-400/70 hover:text-cyan-400"
                >
                    ← Вернуться в Академию
                </button>
            </div>
        );
    }

    const fileUrl = bookFileUrl(bookId);

    return (
        <div className="flex h-screen flex-col bg-[#0B0D12]">
            {/* Top bar */}
            <header className="flex shrink-0 items-center gap-3 border-b border-white/8 bg-[#0E1117]/95 px-4 py-3">
                <button
                    type="button"
                    onClick={() => router.push("/academy?tab=library")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/60 transition hover:border-white/20 hover:text-white"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    На полку
                </button>

                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[13px] font-semibold text-white">
                        {book.title}
                        {book.subtitle && (
                            <span className="ml-1 text-white/50">— {book.subtitle}</span>
                        )}
                    </h1>
                    <p className="text-[10px] text-white/35">
                        {book.author} · {book.year}
                    </p>
                </div>

                {/* Type badge */}
                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/40">
                    {book.type}
                </span>
            </header>

            {/* Reader — full remaining height */}
            <div className="flex min-h-0 flex-1">
                {!progressLoaded ? (
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
                    </div>
                ) : book.type === "pdf" ? (
                    <PdfReader
                        bookId={bookId}
                        title={book.subtitle ? `${book.title}: ${book.subtitle}` : book.title}
                        fileUrl={fileUrl}
                        initialPage={progress?.page ?? 1}
                        onClose={() => router.push("/academy?tab=library")}
                    />
                ) : (
                    <EpubReader
                        bookId={bookId}
                        fileUrl={fileUrl}
                        initialCfi={progress?.cfi}
                    />
                )}
            </div>
        </div>
    );
}
