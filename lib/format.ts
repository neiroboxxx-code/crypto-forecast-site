export function fmtPrice(v: number, digits = 0): string {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(v);
}

/** For values already expressed as a percent (e.g. 2.5 → "+2.50%"). */
export function fmtPct(v: number, digits = 2): string {
    return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

/** For fractional values (e.g. 0.025 → "+2.50%"). */
export function fmtPctFraction(v: number, digits = 2): string {
    return fmtPct(v * 100, digits);
}

/** For 0..1 probabilities (0.63 → "63%"). */
export function fmtProb(v: number): string {
    return `${Math.round(v * 100)}%`;
}

/** For 0..1 confidence (0.26 → "26%"). */
export function fmtConfidence(v: number): string {
    return `${Math.round(v * 100)}%`;
}

export function fmtTime(iso: string): string {
    return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(iso));
}

export function fmtClock(iso: string): string {
    return new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(iso));
}

export function toneForDirection(d: string): "long" | "short" | "info" {
    if (d === "up" || d === "bullish" || d === "enter_long") return "long";
    if (d === "down" || d === "bearish" || d === "avoid_long") return "short";
    return "info";
}
