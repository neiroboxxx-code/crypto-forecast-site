"use client";

import { useEffect, useState } from "react";

type TradePlan = {
    id: string;
    createdAt: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    note?: string;
};

type FormState = {
    entryPrice: string;
    stopLoss: string;
    takeProfit: string;
    note: string;
};

const EMPTY_FORM: FormState = { entryPrice: "", stopLoss: "", takeProfit: "", note: "" };
const STORAGE_KEY = "trade-companion-plans-v1";

function loadPlans(): TradePlan[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as TradePlan[]) : [];
    } catch {
        return [];
    }
}

function persistPlans(plans: TradePlan[]): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch {
        // Quota exceeded or disabled storage — widget still works in-memory.
    }
}

function parseNumber(raw: string): number | null {
    if (!raw.trim()) return null;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
}

function formatPrice(n: number): string {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(n);
}

function sideOf(plan: TradePlan): "LONG" | "SHORT" {
    return plan.takeProfit >= plan.entryPrice ? "LONG" : "SHORT";
}

function riskReward(plan: TradePlan): number | null {
    const risk = Math.abs(plan.entryPrice - plan.stopLoss);
    const reward = Math.abs(plan.takeProfit - plan.entryPrice);
    if (risk === 0) return null;
    return reward / risk;
}

export function TradeCompanion() {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [plans, setPlans] = useState<TradePlan[]>([]);
    const [formError, setFormError] = useState<string | null>(null);

    // Hydrate from localStorage on mount — guarded so SSR stays consistent.
    useEffect(() => {
        setPlans(loadPlans());
    }, []);

    function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (formError) setFormError(null);
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const entry = parseNumber(form.entryPrice);
        const sl = parseNumber(form.stopLoss);
        const tp = parseNumber(form.takeProfit);

        if (entry === null || sl === null || tp === null) {
            setFormError("Fill Entry, Stop Loss and Take Profit with numbers.");
            return;
        }
        if (entry === sl) {
            setFormError("Stop Loss must differ from Entry.");
            return;
        }
        if (entry === tp) {
            setFormError("Take Profit must differ from Entry.");
            return;
        }

        const plan: TradePlan = {
            id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
            entryPrice: entry,
            stopLoss: sl,
            takeProfit: tp,
            note: form.note.trim() || undefined,
        };

        const next = [plan, ...plans].slice(0, 20);
        setPlans(next);
        persistPlans(next);
        setForm(EMPTY_FORM);

        // Placeholder hand-off to future local-alert system. The position-alert
        // monitor LaunchAgent already reads from SQLite; once that endpoint exists
        // we'll POST here instead of mirroring only to localStorage.
        console.info("[TradeCompanion] plan saved (local):", plan);
    }

    function removePlan(id: string) {
        const next = plans.filter((p) => p.id !== id);
        setPlans(next);
        persistPlans(next);
    }

    function clearAll() {
        setPlans([]);
        persistPlans([]);
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open Trade Companion"
                className="fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-[16px] border border-cyan-400/30 bg-[#0E1117]/95 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-[0_12px_30px_-10px_rgba(34,211,238,0.45)] backdrop-blur-md transition hover:border-cyan-400/60 hover:text-white"
            >
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
                Trade Companion
                {plans.length > 0 && (
                    <span className="ml-1 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] tabular-nums text-cyan-200">
                        {plans.length}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-5 right-5 z-40 flex w-[340px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-[16px] border border-white/10 bg-[#0A0C12]/95 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <header className="flex items-center justify-between border-b border-white/8 bg-[#0E1117]/90 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                    </span>
                    <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                            Trade Companion
                        </div>
                        <div className="text-[11px] text-white/60">Entry &amp; Monitoring</div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close Trade Companion"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-white/8 bg-white/[0.03] text-white/60 transition hover:border-white/20 hover:text-white"
                >
                    <svg viewBox="0 0 12 12" className="h-3 w-3">
                        <path
                            d="M2 2 L10 10 M10 2 L2 10"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 px-4 py-3">
                <NumberField
                    label="Entry Price"
                    value={form.entryPrice}
                    onChange={(v) => handleChange("entryPrice", v)}
                    placeholder="e.g. 67450"
                    tone="neutral"
                />
                <div className="grid grid-cols-2 gap-2.5">
                    <NumberField
                        label="Stop Loss"
                        value={form.stopLoss}
                        onChange={(v) => handleChange("stopLoss", v)}
                        placeholder="66800"
                        tone="short"
                    />
                    <NumberField
                        label="Take Profit"
                        value={form.takeProfit}
                        onChange={(v) => handleChange("takeProfit", v)}
                        placeholder="68900"
                        tone="long"
                    />
                </div>
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">
                        Note (optional)
                    </span>
                    <input
                        type="text"
                        value={form.note}
                        onChange={(e) => handleChange("note", e.target.value)}
                        placeholder="reason / setup"
                        className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-white/85 placeholder:text-white/25 focus:border-cyan-400/50 focus:outline-none"
                    />
                </label>

                {formError && (
                    <div className="rounded-md border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-[11px] text-rose-200">
                        {formError}
                    </div>
                )}

                <button
                    type="submit"
                    className="mt-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200 transition hover:border-cyan-400/70 hover:bg-cyan-400/20 hover:text-white"
                >
                    Save Plan
                </button>
            </form>

            <div className="border-t border-white/8 bg-[#0E1117]/60">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                        Saved plans
                        <span className="ml-2 tabular-nums text-white/35">{plans.length}</span>
                    </div>
                    {plans.length > 0 && (
                        <button
                            type="button"
                            onClick={clearAll}
                            className="text-[10px] uppercase tracking-[0.16em] text-white/40 transition hover:text-rose-300"
                        >
                            Clear all
                        </button>
                    )}
                </div>
                <div className="max-h-[220px] overflow-y-auto px-4 pb-3">
                    {plans.length === 0 ? (
                        <div className="rounded-md border border-dashed border-white/10 bg-black/20 py-4 text-center text-[11px] text-white/35">
                            No plans stored yet
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {plans.map((plan) => (
                                <PlanRow
                                    key={plan.id}
                                    plan={plan}
                                    onRemove={() => removePlan(plan.id)}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

function NumberField({
    label,
    value,
    onChange,
    placeholder,
    tone,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    tone: "neutral" | "long" | "short";
}) {
    const accent =
        tone === "long"
            ? "focus:border-emerald-400/60"
            : tone === "short"
              ? "focus:border-rose-400/60"
              : "focus:border-cyan-400/60";

    return (
        <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</span>
            <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[13px] tabular-nums text-white placeholder:text-white/25 focus:outline-none ${accent}`}
            />
        </label>
    );
}

function PlanRow({ plan, onRemove }: { plan: TradePlan; onRemove: () => void }) {
    const side = sideOf(plan);
    const rr = riskReward(plan);
    const sideTone =
        side === "LONG"
            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
            : "border-rose-400/30 bg-rose-400/10 text-rose-300";

    return (
        <li className="rounded-lg border border-white/8 bg-black/30 px-3 py-2">
            <div className="flex items-center justify-between text-[11px]">
                <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${sideTone}`}
                >
                    {side}
                </span>
                <div className="flex items-center gap-2 tabular-nums text-white/45">
                    {rr !== null && (
                        <span title="Reward / Risk">R:R {rr.toFixed(2)}</span>
                    )}
                    <button
                        type="button"
                        onClick={onRemove}
                        aria-label="Remove plan"
                        className="text-white/35 transition hover:text-rose-300"
                    >
                        ✕
                    </button>
                </div>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[11px] tabular-nums">
                <Cell label="Entry" value={formatPrice(plan.entryPrice)} />
                <Cell label="SL" value={formatPrice(plan.stopLoss)} tone="short" />
                <Cell label="TP" value={formatPrice(plan.takeProfit)} tone="long" />
            </div>
            {plan.note && (
                <div className="mt-1.5 truncate text-[10px] text-white/45">{plan.note}</div>
            )}
        </li>
    );
}

function Cell({
    label,
    value,
    tone = "neutral",
}: {
    label: string;
    value: string;
    tone?: "neutral" | "long" | "short";
}) {
    const valueTone =
        tone === "long" ? "text-emerald-300" : tone === "short" ? "text-rose-300" : "text-white";
    return (
        <div className="rounded-md border border-white/6 bg-white/[0.02] px-1.5 py-1">
            <div className="text-[9px] uppercase tracking-wider text-white/35">{label}</div>
            <div className={`${valueTone} font-medium tabular-nums`}>{value}</div>
        </div>
    );
}
