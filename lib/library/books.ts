// Static book catalogue — mirrors backend books.py BOOKS list.

export type BookType = "pdf" | "epub";

export type BookCategory = "trading" | "psychology" | "journals" | "finance" | "philosophy";

export interface BookCategoryMeta {
    id: BookCategory;
    label: string;
    emoji: string;
}

export const BOOK_CATEGORIES: BookCategoryMeta[] = [
    { id: "trading",     label: "Трейдинг",    emoji: "📈" },
    { id: "psychology",  label: "Психология",  emoji: "🧠" },
    { id: "journals",    label: "Журналы",     emoji: "📰" },
    { id: "finance",     label: "Финансы",     emoji: "💰" },
    { id: "philosophy",  label: "Философия",   emoji: "🌿" },
];

export interface Book {
    id: string;
    title: string;
    subtitle?: string;
    author: string;
    year: number;
    type: BookType;
    filename: string;
    spineColor: string;
    category: BookCategory;
}

// ── Book catalogue ────────────────────────────────────────────────────────────

const tradingBooks: Book[] = [
    {
        id: "zarabotok-v-kripte",
        title: "Заработок в крипте",
        subtitle: "Все легальные способы",
        author: "Зайнуллин И.И.",
        year: 2025,
        type: "pdf",
        filename: "zarabotok-v-kripte.pdf",
        spineColor: "#7c3aed",
        category: "trading",
    },
    {
        id: "na-shifre",
        title: "На шифре",
        author: "Шин Лора",
        year: 2024,
        type: "pdf",
        filename: "na-shifre.pdf",
        spineColor: "#0891b2",
        category: "trading",
    },
];

const financeBooks: Book[] = [
    {
        id: "forex-5-hours",
        title: "FOREX на 5 часов",
        subtitle: "в неделю",
        author: "Хорнер Р.",
        year: 2012,
        type: "epub",
        filename: "forex-5-hours.epub",
        spineColor: "#b45309",
        category: "finance",
    },
];

// Журналы Трейдеру 2012–2013 (16 выпусков)
const journalBooks: Book[] = [
    ...[2012, 2013].flatMap((year) =>
        Array.from({ length: 8 }, (_, i) => {
            const num = String(i + 1).padStart(2, "0");
            return {
                id: `zhurnal-treyderu-${year}-${num}`,
                title: "Журнал Трейдеру",
                subtitle: `${year} / ${num}`,
                author: "Редакция",
                year,
                type: "pdf" as BookType,
                filename: `zhurnal-treyderu-${year}-${num}.pdf`,
                spineColor: "#166534",
                category: "journals" as BookCategory,
            };
        }),
    ),
];

export const BOOKS: Book[] = [
    ...tradingBooks,
    ...financeBooks,
    ...journalBooks,
];

export const BOOKS_BY_ID: Record<string, Book> = Object.fromEntries(
    BOOKS.map((b) => [b.id, b]),
);
