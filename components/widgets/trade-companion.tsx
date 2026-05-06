"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "trade-companion-plans-v1";
const TG_STORAGE_KEY = "trade-companion-tg-id";

type TradePlan = {
    id: string;
    createdAt: string;
    symbol: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    telegramId?: string;
    note?: string;
    active: boolean;
};

type FormState = {
    symbol: string;
    entryPrice: string;
    stopLoss: string;
    takeProfit: string;
    telegramId: string;
    note: string;
};

const EMPTY_FORM: FormState = {
    symbol: "BTCUSDT",
    entryPrice: "",
    stopLoss: "",
    takeProfit: "",
    telegramId: "",
    note: "",
};

function loadLocalPlans(): TradePlan[] {
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

function persistLocalPlans(plans: TradePlan[]): void {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); } catch {}
}

function loadSavedTgId(): string {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(TG_STORAGE_KEY) ?? "";
}

function saveTgId(id: string): void {
    try { window.localStorage.setItem(TG_STORAGE_KEY, id); } catch {}
}

function parseNumber(raw: string): number | null {
    if (!raw.trim()) return null;
    const cleaned = raw.trim().replace(/\s/g, "").replace(/,(\d{3})/g, "$1").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

function formatPrice(n: number): string {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
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

type WidgetState = "tab" | "strip" | "open";

export function TradeCompanion() {
    const [state, setState] = useState<WidgetState>("tab");
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [plans, setPlans] = useState<TradePlan[]>([]);
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const stripRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const local = loadLocalPlans();
        setPlans(local);
        const tgId = loadSavedTgId();
        if (tgId) setForm((prev) => ({ ...prev, telegramId: tgId }));
    }, []);

    // Close strip when clicking outside
    useEffect(() => {
        if (state !== "strip") return;
        function onClick(e: MouseEvent) {
            if (stripRef.current && !stripRef.current.contains(e.target as Node)) {
                setState("tab");
            }
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [state]);

    function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (formError) setFormError(null);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const entry = parseNumber(form.entryPrice);
        const sl = parseNumber(form.stopLoss);
        const tp = parseNumber(form.takeProfit);

        if (entry === null || sl === null || tp === null) {
            setFormError("Заполни Entry, Stop Loss и Take Profit числами.");
            return;
        }
        if (entry === sl) { setFormError("Stop Loss должен отличаться от Entry."); return; }
        if (entry === tp) { setFormError("Take Profit должен отличаться от Entry."); return; }

        const tgId = form.telegramId.trim();
        if (tgId) saveTgId(tgId);

        setSaving(true);
        setFormError(null);

        try {
            const res = await fetch(`/api/companion/plan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: form.symbol.trim().toUpperCase() || "BTCUSDT",
                    entry,
                    sl,
                    tp,
                    telegram_id: tgId || null,
                    note: form.note.trim() || null,
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            const saved = data.plan;

            const plan: TradePlan = {
                id: saved.id,
                createdAt: saved.created_at,
                symbol: saved.symbol,
                entryPrice: saved.entry,
                stopLoss: saved.sl,
                takeProfit: saved.tp,
                telegramId: saved.telegram_id ?? undefined,
                note: saved.note ?? undefined,
                active: true,
            };

            const next = [plan, ...plans].slice(0, 20);
            setPlans(next);
            persistLocalPlans(next);
            setForm((prev) => ({ ...prev, entryPrice: "", stopLoss: "", takeProfit: "", note: "" }));
        } catch {
            setFormError("Не удалось сохранить план. Проверь соединение.");
        } finally {
            setSaving(false);
        }
    }

    async function removePlan(id: string) {
        try {
            await fetch(`/api/companion/plan/${id}`, { method: "DELETE" });
        } catch {}
        const next = plans.filter((p) => p.id !== id);
        setPlans(next);
        persistLocalPlans(next);
    }

    function clearAll() {
        plans.forEach((p) => {
            fetch(`/api/companion/plan/${p.id}`, { method: "DELETE" }).catch(() => {});
        });
        setPlans([]);
        persistLocalPlans([]);
    }

    const activePlans = plans.filter((p) => p.active);
    const hasActive = activePlans.length > 0;
    const firstPlan = activePlans[0];

    // ── Tab (collapsed, always visible on right edge) ──────────────────────
    if (state === "tab") {
        return (
            <button
                type="button"
                onClick={() => setState("strip")}
                aria-label="Open Trade Companion"
                className="animate-tc-glow fixed bottom-24 right-0 z-40 flex items-center gap-2 rounded-l-xl border border-r-0 border-cyan-400/20 bg-[#0E1117]/95 px-3 py-2 backdrop-blur-md transition hover:bg-[#0E1117]"
            >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${hasActive ? "bg-emerald-400" : "bg-cyan-400"}`} />
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${hasActive ? "bg-emerald-400" : "bg-cyan-400/60"}`} />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">TC</span>
            </button>
        );
    }

    // ── Strip (hover/click preview) ─────────────────────────────────────────
    if (state === "strip") {
        return (
            <div
                ref={stripRef}
                className="fixed bottom-24 right-0 z-40 flex items-center gap-3 rounded-l-xl border border-r-0 border-cyan-400/20 bg-[#0E1117]/97 px-3 py-2.5 shadow-[0_0_20px_-4px_rgba(34,211,238,0.15),0_8px_32px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            >
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${hasActive ? "bg-emerald-400" : "bg-cyan-400"}`} />
                    <span className={`relative inline-flex h-2 w-2 rounded-full ${hasActive ? "bg-emerald-400" : "bg-cyan-400"}`} />
                </span>

                <div className="flex flex-col">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">Trade Companion</span>
                    {firstPlan ? (
                        <span className="text-[11px] font-medium text-white/70">
                            {firstPlan.symbol} · {sideOf(firstPlan)} · {activePlans.length} план{activePlans.length > 1 ? "а" : ""}
                        </span>
                    ) : (
                        <span className="text-[11px] text-white/40">Нет активных планов</span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setState("open")}
                    className="ml-1 shrink-0 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-300 transition hover:border-cyan-400/60 hover:text-cyan-200"
                >
                    Открыть
                </button>

                <button
                    type="button"
                    onClick={() => setState("tab")}
                    aria-label="Collapse"
                    className="shrink-0 text-white/25 transition hover:text-white/60"
                >
                    <svg viewBox="0 0 10 10" className="h-3 w-3"><path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
            </div>
        );
    }

    // ── Full panel ──────────────────────────────────────────────────────────
    return (
        <div className="fixed bottom-5 right-5 z-40 flex w-[340px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-[16px] border border-cyan-400/25 bg-[#0A0C12]/97 shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_24px_60px_-20px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(34,211,238,0.15)] backdrop-blur-xl">
            <header className="flex items-center justify-between border-b border-white/8 bg-[#0E1117]/90 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${hasActive ? "bg-emerald-400" : "bg-cyan-400"}`} />
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${hasActive ? "bg-emerald-400" : "bg-cyan-400"}`} />
                    </span>
                    <div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">Trade Companion</div>
                        <div className="text-[11px] text-white/60">
                            {hasActive ? `${activePlans.length} активных план${activePlans.length > 1 ? "а" : ""}` : "Entry & Monitoring"}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setState("strip")}
                        aria-label="Minimize"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/8 bg-white/[0.03] text-white/40 transition hover:border-white/20 hover:text-white/70"
                        title="Свернуть"
                    >
                        <svg viewBox="0 0 12 3" className="h-2.5 w-3"><path d="M1 1.5 H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => setState("tab")}
                        aria-label="Close"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/8 bg-white/[0.03] text-white/60 transition hover:border-white/20 hover:text-white"
                    >
                        <svg viewBox="0 0 12 12" className="h-3 w-3"><path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 px-4 py-3">
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Symbol</span>
                    <input
                        type="text"
                        value={form.symbol}
                        onChange={(e) => handleChange("symbol", e.target.value.toUpperCase())}
                        placeholder="BTCUSDT"
                        className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] uppercase text-white/85 placeholder:text-white/25 focus:border-cyan-400/50 focus:outline-none"
                    />
                </label>

                <NumberField label="Entry Price" value={form.entryPrice} onChange={(v) => handleChange("entryPrice", v)} placeholder="e.g. 81500" tone="neutral" />
                <div className="grid grid-cols-2 gap-2.5">
                    <NumberField label="Stop Loss" value={form.stopLoss} onChange={(v) => handleChange("stopLoss", v)} placeholder="81300" tone="short" />
                    <NumberField label="Take Profit" value={form.takeProfit} onChange={(v) => handleChange("takeProfit", v)} placeholder="81800" tone="long" />
                </div>

                <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Telegram ID</span>
                    <a
                        href="https://t.me/crycom_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 rounded-md border border-cyan-400/25 bg-cyan-400/8 py-1.5 text-[12px] font-medium text-cyan-300 transition hover:border-cyan-400/50 hover:text-cyan-200"
                    >
                        Написать /start боту @crycom_bot →
                    </a>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={form.telegramId}
                        onChange={(e) => handleChange("telegramId", e.target.value)}
                        placeholder="383042111"
                        className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] tabular-nums text-white/85 placeholder:text-white/25 focus:border-cyan-400/50 focus:outline-none"
                    />
                </label>

                <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/40">Note (optional)</span>
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
                    disabled={saving}
                    className="mt-1 rounded-lg border border-cyan-400/40 bg-cyan-400/10 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200 transition hover:border-cyan-400/70 hover:bg-cyan-400/20 hover:text-white disabled:opacity-50"
                >
                    {saving ? "Saving…" : "Save Plan"}
                </button>
            </form>

            <div className="border-t border-white/8 bg-[#0E1117]/60">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
                        Активные планы
                        <span className="ml-2 tabular-nums text-white/35">{activePlans.length}</span>
                    </div>
                    {activePlans.length > 0 && (
                        <button type="button" onClick={clearAll} className="text-[10px] uppercase tracking-[0.16em] text-white/40 transition hover:text-rose-300">
                            Удалить все
                        </button>
                    )}
                </div>
                <div className="max-h-[200px] overflow-y-auto px-4 pb-3">
                    {activePlans.length === 0 ? (
                        <div className="rounded-md border border-dashed border-white/10 bg-black/20 py-4 text-center text-[11px] text-white/35">
                            Нет активных планов
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {activePlans.map((plan) => (
                                <PlanRow key={plan.id} plan={plan} onRemove={() => removePlan(plan.id)} />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

function NumberField({ label, value, onChange, placeholder, tone }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; tone: "neutral" | "long" | "short";
}) {
    const accent = tone === "long" ? "focus:border-emerald-400/60" : tone === "short" ? "focus:border-rose-400/60" : "focus:border-cyan-400/60";
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
    const sideTone = side === "LONG"
        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
        : "border-rose-400/30 bg-rose-400/10 text-rose-300";

    return (
        <li className="rounded-lg border border-white/8 bg-black/30 px-3 py-2">
            <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${sideTone}`}>{side}</span>
                    <span className="text-[10px] font-medium text-white/50">{plan.symbol}</span>
                    {plan.telegramId && <span className="text-[9px] text-emerald-400/70" title="Telegram алерты активны">●</span>}
                </div>
                <div className="flex items-center gap-2 tabular-nums text-white/45">
                    {rr !== null && <span title="Reward / Risk">R:R {rr.toFixed(2)}</span>}
                    <button type="button" onClick={onRemove} aria-label="Remove plan" className="text-white/35 transition hover:text-rose-300">✕</button>
                </div>
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[11px] tabular-nums">
                <Cell label="Entry" value={formatPrice(plan.entryPrice)} />
                <Cell label="SL" value={formatPrice(plan.stopLoss)} tone="short" />
                <Cell label="TP" value={formatPrice(plan.takeProfit)} tone="long" />
            </div>
            {plan.note && <div className="mt-1.5 truncate text-[10px] text-white/45">{plan.note}</div>}
        </li>
    );
}

function Cell({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "long" | "short" }) {
    const valueTone = tone === "long" ? "text-emerald-300" : tone === "short" ? "text-rose-300" : "text-white";
    return (
        <div className="rounded-md border border-white/6 bg-white/[0.02] px-1.5 py-1">
            <div className="text-[9px] uppercase tracking-wider text-white/35">{label}</div>
            <div className={`${valueTone} font-medium tabular-nums`}>{value}</div>
        </div>
    );
}
