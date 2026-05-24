import type { AcademyCategoryId } from "./types";

/**
 * Папки в `public/`. Порядок в `CATEGORY_META`: основные блоки сверху,
 * «Локальные стратегии», «Зоны влияния», «Инфографика» (внизу страницы).
 */
export const ACADEMY_FOLDER_GROUPS: Record<AcademyCategoryId, readonly string[]> = {
    neophiles: [
        "zone/Survival_Protocol",
        "zone/Trade_Setup_Protocol",
        "zone/Trade_Architecture",
    ],
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
    zones: [
        "zone/Trend_Anatomy",
        "zone/Magic_zones",
        "zone/Important_about_volume",
        "zone/RSI_Market_Pulse",
    ],
    infographic: ["zone/Anatomy_of_a_candle"],
    price_action_trader: [
        "NEWS/Price Action Trader/Anatomy_of_Execution",
        "NEWS/Price Action Trader/Capital_Survival_Protocol",
        "NEWS/Price Action Trader/Market_X-Ray",
        "NEWS/Price Action Trader/Price_Action_Anatomy",
        "NEWS/Price Action Trader/The_Aviator_Protocol",
        "NEWS/Price Action Trader/Universal_Price_Action_Mechanics",
        "NEWS/Price Action Trader/YTC_Price_Action_Blueprint",
    ],
    // Library tab has no slide folders — handled separately in AcademyDashboard
    library: [],
};

export const CATEGORY_META: readonly { id: AcademyCategoryId; label: string; hint: string }[] = [
    {
        id: "neophiles",
        label: "ВВЕДЕНИЕ",
        hint: "Стартовый Survival Protocol",
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
    {
        id: "price_action_trader",
        label: "Price Action Trader",
        hint: "YTC Price Action · Lance Beggs",
    },
    {
        id: "library",
        label: "📚 Библиотека",
        hint: "Книги · PDF и EPUB",
    },
];
