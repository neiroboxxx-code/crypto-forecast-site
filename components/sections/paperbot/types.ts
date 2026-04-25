export type PaperSide = "long" | "short";

export type PaperBotStatus = "standby" | "active" | "stopped";

export type PaperPosition = {
    id: string;
    symbol: string;
    side: PaperSide;
    size: number;
    entry: number;
    mark: number;
    sl: number;
    tp: number;
    leverage: number;
    openedAt: string;
    pnlUsd: number;
    pnlPct: number;
    distanceToSlPct: number;
    distanceToTpPct: number;
};

export type PaperClosedTrade = {
    id: string;
    symbol: string;
    side: PaperSide;
    entry: number;
    exit: number;
    size: number;
    leverage: number;
    openedAt: string;
    closedAt: string;
    pnlUsd: number;
    pnlPct: number;
    closeReason: "sl" | "tp" | "manual" | "signal_flip";
};

export type PaperLogEntry = {
    id: string;
    ts: string;
    level: "info" | "trade" | "risk";
    message: string;
};

export type PaperSummary = {
    equityUsd: number;
    startingUsd: number;
    unrealizedUsd: number;
    realizedTodayUsd: number;
    winRatePct: number;
    tradesToday: number;
    winRateLifetimePct: number;
    maxDrawdownPct: number;
    totalTrades: number;
};

export type PaperSettings = {
    depositUsd: number;
    riskPct: number;
    leverage: number;
    minConfidence: "low" | "medium" | "high";
    minProbabilityPct: number;
    allowLong: boolean;
    allowShort: boolean;
    maxPositions: number;
};

export type PaperSignalState = {
    direction: "bull" | "bear" | "neutral";
    probability: number;
    confidence: "high" | "medium" | "low";
    label: string;
    updatedAt: string;
};
