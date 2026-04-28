import type { AcademyCategoryId } from "./types";

/**
 * Папки в `public/`. Порядок в `CATEGORY_META`: основные блоки сверху,
 * «Локальные стратегии», «Зоны влияния», «Инфографика» (внизу страницы).
 */
export const ACADEMY_FOLDER_GROUPS: Record<AcademyCategoryId, readonly string[]> = {
    neophiles: ["zone/Trading_Survival_Architecture"],
    technical: [
        "Candlestick_Mastery.",
        "Tactical_Candlestick_Analysis",
        "Candlestick_Reversal_Anatomy",
        "The_Trader_s_Blueprint",
    ],
    psychology: ["The_Probability_Blueprint", "Mind_Architecture", "Tactical_Trading_Playbook"],
    anatomy: [
        "Market_Engine_Blueprint",
        "Market_Microstructure_Architecture",
        "Market_Microstructure_Blueprint",
    ],
    local: ["Smart_Money_Protocol", "The_Volume_Compass", "Whale_Hunting", "Liquidity_Trap_Mastery"],
    zones: ["zone/Trend_Anatomy", "zone/Magic_zones", "zone/Important_about_volume"],
    infographic: ["zone/Anatomy_of_a_candle"],
};

export const CATEGORY_META: readonly { id: AcademyCategoryId; label: string; hint: string }[] = [
    {
        id: "neophiles",
        label: "Неофилам",
        hint: "Старт: архитектура выживания",
    },
    {
        id: "technical",
        label: "Технический анализ",
        hint: "Свечи, тактика, развороты",
    },
    {
        id: "psychology",
        label: "Психология трейдинга",
        hint: "Процесс, дисциплина, ожидания",
    },
    {
        id: "anatomy",
        label: "Анатомия рынка",
        hint: "Движок и микроструктура",
    },
    {
        id: "local",
        label: "Локальные стратегии",
        hint: "Материалы протокола (локально)",
    },
    {
        id: "zones",
        label: "Зоны влияния",
        hint: "Тренд, зоны, объём",
    },
    {
        id: "infographic",
        label: "Инфографика",
        hint: "Схемы и наглядные справки",
    },
];
