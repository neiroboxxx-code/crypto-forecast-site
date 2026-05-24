// Static book catalogue — mirrors backend books.py BOOKS list.

export type BookType = "pdf" | "epub";

export interface Book {
    id: string;
    title: string;
    subtitle?: string;
    author: string;
    year: number;
    type: BookType;
    filename: string;
    spineColor: string;
}

export const BOOKS: Book[] = [
    {
        id: "zarabotok-v-kripte",
        title: "Заработок в крипте",
        subtitle: "Все легальные способы",
        author: "Зайнуллин И.И.",
        year: 2025,
        type: "pdf",
        filename: "zarabotok-v-kripte.pdf",
        spineColor: "#7c3aed",
    },
    {
        id: "na-shifre",
        title: "На шифре",
        author: "Шин Лора",
        year: 2024,
        type: "pdf",
        filename: "na-shifre.pdf",
        spineColor: "#0891b2",
    },
    {
        id: "forex-5-hours",
        title: "FOREX на 5 часов",
        subtitle: "в неделю",
        author: "Хорнер Р.",
        year: 2012,
        type: "epub",
        filename: "forex-5-hours.epub",
        spineColor: "#b45309",
    },
];

export const BOOKS_BY_ID: Record<string, Book> = Object.fromEntries(
    BOOKS.map((b) => [b.id, b]),
);
