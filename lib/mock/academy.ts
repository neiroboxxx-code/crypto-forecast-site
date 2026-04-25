export type AcademyPhase = "phase_1" | "phase_2";

export type AcademyMaterial = {
    id: string;
    title: string;
    topic: string;
    pages: number;
    updatedAt: string;
};

export type AcademyReport = {
    id: string;
    title: string;
    phase: AcademyPhase;
    symbol: string;
    recordedAt: string;
    summary: string;
    tags: string[];
};

export const academyMaterials: AcademyMaterial[] = [
    {
        id: "mat-1",
        title: "Candlestick Mastery",
        topic: "База свечного анализа",
        pages: 48,
        updatedAt: "2026-04-18",
    },
    {
        id: "mat-2",
        title: "Reversal Anatomy",
        topic: "Структура разворотов",
        pages: 36,
        updatedAt: "2026-04-12",
    },
    {
        id: "mat-3",
        title: "Market Microstructure",
        topic: "Микроструктура и ликвидность",
        pages: 62,
        updatedAt: "2026-04-05",
    },
];

export const academyReports: AcademyReport[] = [
    {
        id: "rep-101",
        title: "BTC — локальный разворот 4H (зона ликвидности)",
        phase: "phase_1",
        symbol: "BTCUSDT",
        recordedAt: "2026-04-22T14:20:00Z",
        summary:
            "Мок: краткий LLM-транскрипт. Давление на нижнюю границу диапазона, отскок сниженного объёма, подтверждение на закрытии 4H.",
        tags: ["4H", "liquidity sweep", "range"],
    },
    {
        id: "rep-102",
        title: "BTC — сценарий Phase 2: подтверждение структуры",
        phase: "phase_2",
        symbol: "BTCUSDT",
        recordedAt: "2026-04-21T09:05:00Z",
        summary:
            "Мок: фаза 2 — проверка follow-through после импульса. Ожидание ретеста зоны и реакции на объёме.",
        tags: ["phase 2", "structure", "retest"],
    },
    {
        id: "rep-103",
        title: "ETH — кандидат на разворот (контекст BTC)",
        phase: "phase_1",
        symbol: "ETHUSDT",
        recordedAt: "2026-04-19T18:40:00Z",
        summary:
            "Мок: корреляция с BTC, локальный sweep, возврат в диапазон. Риск: слабая дельта на отскоке.",
        tags: ["ETH", "correlation", "sweep"],
    },
];
