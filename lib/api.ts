const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

async function request<T>(path: string, init?: RequestInit, base: string = API_URL, timeoutMs = 30_000): Promise<T> {
    const url = path.startsWith("http") ? path : `${base}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            ...init,
            headers: { "Accept": "application/json", ...(init?.headers ?? {}) },
            cache: "no-store",
            signal: controller.signal,
        });
        if (!res.ok) {
            throw new ApiError(`HTTP ${res.status} @ ${url}`, res.status);
        }
        return res.json() as Promise<T>;
    } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
            throw new ApiError(`Timeout @ ${url}`, 408);
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

// ---------- Reversal (Macro) ----------

export type ZoneInteraction = {
    timeframe: string;
    kind: "support" | "resistance" | string;
    interaction: string;
    zone_id: string;
    low: number;
    high: number;
};

export type ReversalScores = {
    context_score: number;
    zone_score: number;
    feature_score: number;
    structure_score: number;
    confirmation_score: number;
    total_score: number;
};

export type ReversalCandidate = {
    candidate_id: string;
    event_timestamp: string;
    direction: "bullish" | "bearish" | string;
    timeframe_main: string;
    status: string;
    trigger_price: number;
    classification: "low" | "medium" | "high" | string;
    zone_interaction: ZoneInteraction;
    machine_reason: string[];
    scores: ReversalScores;
};

export type MarketContext = {
    bias_4h: string;
    bias_1d: string;
    market_mode_4h: string;
    market_mode_1d: string;
    current_price_4h: number;
    current_price_1d: number;
};

export type ForecastHorizon = {
    direction: "bull" | "bear" | "neutral" | string;
    probability: number;
    label: string;
    confidence: "high" | "medium" | "low" | string;
};

export type ForecastFactor = {
    name: string;
    signal: "bull" | "bear" | "neutral" | string;
    contribution: number;
    raw: number;
    weight: number;
};

export type Forecast = {
    forecast_4h: ForecastHorizon;
    forecast_8h: ForecastHorizon;
    factors: ForecastFactor[];
    raw_score: number;
    candles_used: number;
};

export type ReversalDiagnostics = {
    latest_rsi_4h?: number;
    latest_rsi_1d?: number;
    momentum_slowdown_status_4h?: string;
    momentum_slowdown_status_1d?: string;
    bias_4h?: string;
    bias_1d?: string;
};

export type ReversalData = {
    meta: {
        symbol: string;
        engine_output_at: string;
    };
    market_context: MarketContext;
    candidates: ReversalCandidate[];
    diagnostics?: ReversalDiagnostics;
    forecast?: Forecast;
};

function unwrap<T>(payload: unknown): T {
    // FastAPI wraps successful payloads in { status, ..., data: <T>, cached }.
    // Fall back to the raw payload if a route returns T directly.
    if (payload && typeof payload === "object" && "data" in payload) {
        const d = (payload as { data?: unknown }).data;
        if (d !== undefined && d !== null) return d as T;
    }
    return payload as T;
}

export async function getReversal(): Promise<ReversalData> {
    const raw = await request<unknown>("/api/reversal/run");
    return unwrap<ReversalData>(raw);
}

// ---------- Reversal AI Thesis (DeepSeek) ----------

export type ThesisTask =
    | "summarize_week"
    | "analyze_candidate"
    | "explain_no_candidate"
    | "none"
    | "unknown"
    | string;

export type MarketThesis = {
    status: string;
    task: ThesisTask;
    should_call_llm: boolean;
    /** Preferred key. Falls back to `text` on older backends. */
    thesis: string | null;
    /** Legacy alias of `thesis`. */
    text: string | null;
    mode: string;
    symbol: string;
    generated_at: string;
    cached: boolean;
    error: string | null;
    events?: Array<{
        id: string;
        ordinal: number;
        anchor_ts: string | null;
        direction: string;
        bias: "long" | "short" | "wait" | string;
        snapshot_url: string | null;
        snapshot_status?: string | null;
        zone?: {
            kind: "support" | "resistance" | string;
            low: number | null;
            high: number | null;
        } | null;
    }>;
};

export async function getMarketThesis(): Promise<MarketThesis> {
    const raw = await request<unknown>("/api/reversal/thesis?mode=historical", undefined, API_URL, 200_000);
    const thesis = unwrap<MarketThesis>(raw);
    if (process.env.NODE_ENV !== "production") {
        console.log("[getMarketThesis] raw payload:", raw, "→ unpacked:", thesis);
    }
    return thesis;
}

// ---------- 24H Micro ----------

export type MicroPrediction = {
    symbol: string;
    prediction_time: string;
    target_time: string;
    current_price: number;
    prediction_direction: "up" | "down" | "sideways" | string;
    trade_action: "enter_long" | "avoid_long" | "no_trade" | string;
    probability_up: number;
    probability_down: number;
    confidence: number;
    model_version: string;
    notes: string;
    latest_timestamp: string;
};

export type MicroFeatures = {
    latest_timestamp: string;
    latest_close: number;
    /** Fraction (0.0159 == +1.59%). */
    price_change_1h: number;
    /** Fraction (0.0159 == +1.59%). */
    price_change_24h: number;
    avg_volume_24h: number;
    latest_volume: number;
    avg_volume_10: number;
    volume_ratio_10: number;
    high_volume_bar: number | boolean;
    bullish_volume_pressure: number | boolean;
    bearish_volume_pressure: number | boolean;
    volatility_24h: number;
    atr_14: number;
};

export type LiquidityPool = {
    level: number;
    pool_type: "swing_high" | "swing_low" | string;
    timestamp: string;
    volume: number;
    bar_index: number;
};

export type LiquiditySweep = {
    pool_level: number;
    pool_type: string;
    sweep_timestamp: string;
    sweep_bar_index?: number;
    sweep_volume?: number;
    direction?: string;
    [key: string]: unknown;
};

export type MicroPriceAction = {
    active_pools: LiquidityPool[];
    recent_sweeps: LiquiditySweep[];
    bullish_sweep_detected: boolean | number;
    bearish_sweep_detected: boolean | number;
    bullish_sweep_volume_confirmed: boolean | number;
    bearish_sweep_volume_confirmed: boolean | number;
};

export type MicroData = {
    prediction: MicroPrediction;
    features: MicroFeatures;
    price_action: MicroPriceAction;
};

export async function getMicro(): Promise<MicroData> {
    const raw = await request<unknown>("/api/micro/run");
    return unwrap<MicroData>(raw);
}

// ---------- News (internal Next.js proxy) ----------

export type NewsItem = {
    published_at: string;
    source: string;
    title: string;
    url?: string;
    summary: string;
    sentiment: number | string | null;
    impact_score: number | null;
    requires_confirmation?: boolean;
    is_confirmed?: boolean;
    source_layer?: string | null;
    btc_relevance_score?: number | null;
    event_key?: string | null;
    market_regime_effect?: string | null;
};

export type NewsData = {
    updated_at: string;
    symbol?: string;
    signal_context?: { summary?: string };
    features?: {
        confirmed_events_count?: number;
        risk_off_pressure?: number;
        avg_confirmed_btc_relevance?: number;
        oil_shock_count?: number;
    };
    items: NewsItem[];
};

export async function getNews(): Promise<NewsData> {
    const raw = await request<unknown>("/api/news", undefined, "");
    return unwrap<NewsData>(raw);
}

// ---------- Market digest (static JSON from pipeline) ----------

export type MarketDigestData = {
    updatedAt: string;
    title: string;
    bodyMarkdown: string;
    meta?: {
        source?: string;
        model?: string | null;
        llmError?: string | null;
        fetchStatus?: Record<string, string>;
        /** Фильтры + финальная модель (если source === "llm") */
        llmPipeline?: {
            filterModel?: string;
            finalModel?: string;
            filterSteps?: number;
            filterFiles?: string[];
            filterFilesAttempted?: string[];
        } | null;
    };
};

export async function getDigest(): Promise<MarketDigestData> {
    const raw = await request<unknown>("/api/digest");
    return unwrap<MarketDigestData>(raw);
}

// ---------- Health ----------

// ---------- PaperBot ----------

export type PaperBotSettings = {
    depositUsd: number;
    riskPct: number;
    leverage: number;
    leverageEnabled: boolean;
    minConfidence: "low" | "medium" | "high" | string;
    minProbabilityPct: number;
    allowLong: boolean;
    allowShort: boolean;
    maxPositions: number;
    positionTimeoutHours: number;
    isActive: boolean;
};

export type PaperBotMonitor = {
    lastAt: string | null;
    lastPrice: number | null;
    lastPositions: number;
};

export type PaperBotPosition = {
    id: string;
    symbol: string;
    side: "long" | "short";
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

export type PaperBotClosedTrade = {
    id: string;
    symbol: string;
    side: "long" | "short";
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

export type PaperBotLogEntry = {
    id: string;
    ts: string;
    level: "info" | "trade" | "risk";
    message: string;
};

export type PaperBotSummary = {
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

export type PaperBotSignal = {
    direction: "bull" | "bear" | "neutral" | string;
    probability: number;
    confidence: "high" | "medium" | "low" | string;
    label: string;
    updatedAt: string;
};

export type PaperBotState = {
    settings: PaperBotSettings;
    positions: PaperBotPosition[];
    closedTrades: PaperBotClosedTrade[];
    log: PaperBotLogEntry[];
    summary: PaperBotSummary;
    signal: PaperBotSignal | null;
    monitor: PaperBotMonitor | null;
};

export async function getPaperbotState(): Promise<PaperBotState> {
    return request<PaperBotState>("/api/paperbot/state");
}

export async function startPaperbot(): Promise<void> {
    await request<unknown>("/api/paperbot/start", { method: "POST" });
}

export async function stopPaperbot(): Promise<void> {
    await request<unknown>("/api/paperbot/stop", { method: "POST" });
}

export async function updatePaperbotSettings(s: Omit<PaperBotSettings, "isActive">): Promise<void> {
    await request<unknown>("/api/paperbot/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            deposit_usd: s.depositUsd,
            risk_pct: s.riskPct,
            leverage: s.leverage,
            leverage_enabled: s.leverageEnabled,
            min_confidence: s.minConfidence,
            min_probability_pct: s.minProbabilityPct,
            allow_long: s.allowLong,
            allow_short: s.allowShort,
            max_positions: s.maxPositions,
            position_timeout_hours: s.positionTimeoutHours,
        }),
    });
}

export async function runPaperbotTick(): Promise<void> {
    await request<unknown>("/api/paperbot/run", { method: "POST" });
}

// ---------- Health ----------

export type HealthStatus = {
    ok: boolean;
    timestamp: string;
};

export async function getHealth(): Promise<HealthStatus> {
    try {
        await request<unknown>("/health");
        return { ok: true, timestamp: new Date().toISOString() };
    } catch {
        return { ok: false, timestamp: new Date().toISOString() };
    }
}

// ---------- HTF Context ----------

export type HtfKeyLevel = {
    price: number;
    zone_low: number;
    zone_high: number;
    type: "support" | "resistance" | "flip_zone" | "midpoint";
    source: string;
    strength: "strong" | "medium" | "weak";
    distance_pct: number;
    distance_atr: number;
    is_broken: boolean;
};

export type HtfRiskWarning = {
    code: string;
    severity: "high" | "medium" | "low";
    message: string;
};

export type HtfContext = {
    status: "ok" | "insufficient_data" | "error";
    symbol: string;
    updated_at: string;
    data_freshest_candle_at: string | null;
    horizon: string;
    macro_bias: "bullish" | "bearish" | "range" | "transition" | null;
    long_context: "favorable" | "neutral" | "unfavorable" | null;
    trend_regime: "strong_uptrend" | "weak_uptrend" | "neutral" | "downtrend" | "overheated" | "unknown" | null;
    weekly_structure: {
        state: string;
        last_swing_high: { price: number; timestamp: string } | null;
        last_swing_low: { price: number; timestamp: string } | null;
        structure_break: boolean;
        choch: boolean;
    } | null;
    daily_ema_context: {
        ema_200: number | null;
        ema_50: number | null;
        above_200ema: boolean | null;
        above_50ema: boolean | null;
        ema_200_slope: "rising" | "flat" | "falling" | null;
        ema_50_vs_200: "above" | "below" | "crossing" | null;
        distance_from_200ema_pct: number | null;
    } | null;
    key_levels: HtfKeyLevel[];
    distance_to_levels: {
        nearest_support: number | null;
        nearest_resistance: number | null;
        distance_to_support_pct: number | null;
        distance_to_resistance_pct: number | null;
        distance_to_support_atr: number | null;
        distance_to_resistance_atr: number | null;
        location: "near_support" | "near_resistance" | "mid_range" | "normal";
    } | null;
    atr_context: {
        weekly_atr_14: number | null;
        monthly_atr_12: number | null;
        current_week_range: number | null;
        current_month_range: number | null;
        week_range_used_pct: number | null;
        month_range_used_pct: number | null;
        weekly_range_status: "fresh" | "normal" | "extended" | "exhausted" | "unknown" | null;
    } | null;
    risk_warnings: HtfRiskWarning[];
    cached: boolean;
};

export async function fetchHtfContext(symbol = "BTCUSDT"): Promise<HtfContext> {
    return request<HtfContext>(`/api/htf/context?symbol=${symbol}`);
}
