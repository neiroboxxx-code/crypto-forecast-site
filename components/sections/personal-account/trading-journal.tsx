"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Camera, ChevronDown, ImagePlus, Plus, Save } from "lucide-react";

export type JournalTrade = {
    id: string;
    date: string;
    instrument: string;
    timeframe: string;
    entry: string;
    stop: string;
    target: string;
    riskPct: string;
    beforeUrl: string | null;
    afterUrl: string | null;
};

function isoDateLocal(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatListDate(iso: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
}

function tradeSummaryLine(t: JournalTrade): string {
    const entry = t.entry.trim() || "—";
    const target = t.target.trim() || "—";
    return `${formatListDate(t.date)} · ${t.instrument.trim() || "—"} · ${t.timeframe.trim() || "—"} · ${entry} → ${target}`;
}

const INSTRUMENTS = [
    "BTC/USD",
    "ETH/USD",
    "SOL/USD",
    "BNB/USD",
    "XRP/USD",
    "ADA/USD",
    "LINK/USD",
    "DOT/USD",
    "AVAX/USD",
    "ONDO/USD",
] as const;

const TIMEFRAMES = ["M15", "M30", "H1", "H2", "H4", "H6", "H12", "D1", "W1"] as const;

function isoFromDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function buildDateSelectOptions(includeIso: string): { value: string; label: string }[] {
    const out: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i <= 400; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const iso = isoFromDate(d);
        let label = formatListDate(iso);
        if (i === 0) label += " · сегодня";
        else if (i === 1) label += " · вчера";
        out.push({ value: iso, label });
    }
    const vals = new Set(out.map((o) => o.value));
    if (/^\d{4}-\d{2}-\d{2}$/.test(includeIso) && !vals.has(includeIso)) {
        out.unshift({
            value: includeIso,
            label: `${formatListDate(includeIso)} · из записи`,
        });
    }
    return out;
}

function mergedInstrumentOptions(current: string): { value: string; label: string }[] {
    const trimmed = current.trim();
    const base = INSTRUMENTS.map((p) => ({ value: p, label: p }));
    if (!trimmed) return [...base];
    if (INSTRUMENTS.includes(trimmed as (typeof INSTRUMENTS)[number])) return [...base];
    return [{ value: trimmed, label: `${trimmed} · из записи` }, ...base];
}

function mergedTimeframeOptions(current: string): { value: string; label: string }[] {
    const trimmed = current.trim();
    const base = TIMEFRAMES.map((p) => ({ value: p, label: p }));
    if (!trimmed) return [...base];
    if (TIMEFRAMES.includes(trimmed as (typeof TIMEFRAMES)[number])) return [...base];
    return [{ value: trimmed, label: `${trimmed} · из записи` }, ...base];
}

const emptyForm = (): Omit<JournalTrade, "id"> => ({
    date: isoDateLocal(),
    instrument: "BTC/USD",
    timeframe: "H1",
    entry: "",
    stop: "",
    target: "",
    riskPct: "",
    beforeUrl: null,
    afterUrl: null,
});

export function TradingJournal() {
    const [trades, setTrades] = useState<JournalTrade[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<Omit<JournalTrade, "id">>(emptyForm());

    const blobRegistry = useRef(new Set<string>());
    const beforeInputRef = useRef<HTMLInputElement>(null);
    const afterInputRef = useRef<HTMLInputElement>(null);

    const registerBlob = (url: string) => {
        blobRegistry.current.add(url);
    };

    const revokeIfTracked = (url: string | null) => {
        if (url && blobRegistry.current.has(url)) {
            URL.revokeObjectURL(url);
            blobRegistry.current.delete(url);
        }
    };

    useEffect(() => {
        return () => {
            blobRegistry.current.forEach((u) => URL.revokeObjectURL(u));
            blobRegistry.current.clear();
        };
    }, []);

    const sortedTrades = useMemo(() => {
        return [...trades].sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.id.localeCompare(a.id);
        });
    }, [trades]);

    const urlsReferencedByTrades = useMemo(() => {
        const s = new Set<string>();
        for (const t of trades) {
            if (t.beforeUrl) s.add(t.beforeUrl);
            if (t.afterUrl) s.add(t.afterUrl);
        }
        return s;
    }, [trades]);

    const dateSelectOptions = useMemo(() => buildDateSelectOptions(form.date), [form.date]);
    const instrumentSelectOptions = useMemo(() => mergedInstrumentOptions(form.instrument), [form.instrument]);
    const timeframeSelectOptions = useMemo(() => mergedTimeframeOptions(form.timeframe), [form.timeframe]);

    const resolvedDate =
        dateSelectOptions.find((o) => o.value === form.date)?.value
        ?? dateSelectOptions[0]?.value
        ?? isoDateLocal();
    const resolvedInstrument =
        instrumentSelectOptions.find((o) => o.value === form.instrument.trim())?.value ?? INSTRUMENTS[0];
    const resolvedTimeframe =
        timeframeSelectOptions.find((o) => o.value === form.timeframe.trim())?.value ?? "H1";

    useEffect(() => {
        if (dateSelectOptions.length === 0) return;
        if (!dateSelectOptions.some((o) => o.value === form.date)) {
            const next = dateSelectOptions[0]?.value ?? isoDateLocal();
            setForm((f) => (f.date === next ? f : { ...f, date: next }));
        }
    }, [form.date, dateSelectOptions]);

    useEffect(() => {
        if (!form.instrument.trim()) {
            setForm((f) => (f.instrument === INSTRUMENTS[0] ? f : { ...f, instrument: INSTRUMENTS[0] }));
        }
    }, [form.instrument]);

    useEffect(() => {
        if (!form.timeframe.trim()) {
            setForm((f) => (f.timeframe === "H1" ? f : { ...f, timeframe: "H1" }));
        }
    }, [form.timeframe]);

    const revokeOrphanSlots = () => {
        if (form.beforeUrl && !urlsReferencedByTrades.has(form.beforeUrl)) revokeIfTracked(form.beforeUrl);
        if (form.afterUrl && !urlsReferencedByTrades.has(form.afterUrl)) revokeIfTracked(form.afterUrl);
    };

    const setImageFromFile = (file: File | null, slot: "before" | "after") => {
        if (!file || !file.type.startsWith("image/")) return;
        const url = URL.createObjectURL(file);
        registerBlob(url);
        setForm((prev) => {
            const key = slot === "before" ? "beforeUrl" : "afterUrl";
            const prevUrl = prev[key];
            if (prevUrl && !urlsReferencedByTrades.has(prevUrl)) {
                revokeIfTracked(prevUrl);
            }
            return { ...prev, [key]: url };
        });
    };

    const resetForm = () => {
        revokeOrphanSlots();
        setForm(emptyForm());
        setEditingId(null);
    };

    const handleSelectTrade = (t: JournalTrade) => {
        revokeOrphanSlots();
        setEditingId(t.id);
        setForm({
            date: t.date,
            instrument: t.instrument,
            timeframe: t.timeframe,
            entry: t.entry,
            stop: t.stop,
            target: t.target,
            riskPct: t.riskPct,
            beforeUrl: t.beforeUrl,
            afterUrl: t.afterUrl,
        });
    };

    const handleSave = () => {
        const payload: JournalTrade = {
            id: editingId ?? crypto.randomUUID(),
            ...form,
        };

        setTrades((prev) => {
            const without = prev.filter((x) => x.id !== payload.id);
            const old = prev.find((x) => x.id === payload.id);
            if (old) {
                if (old.beforeUrl !== payload.beforeUrl) revokeIfTracked(old.beforeUrl);
                if (old.afterUrl !== payload.afterUrl) revokeIfTracked(old.afterUrl);
            }
            return [payload, ...without];
        });
        setEditingId(payload.id);
    };

    const handleDelete = (id: string) => {
        setTrades((prev) => {
            const hit = prev.find((t) => t.id === id);
            if (hit) {
                revokeIfTracked(hit.beforeUrl);
                revokeIfTracked(hit.afterUrl);
            }
            return prev.filter((t) => t.id !== id);
        });
        if (editingId === id) resetForm();
    };

    const Field = ({
        label,
        children,
        className = "",
    }: {
        label: string;
        children: ReactNode;
        className?: string;
    }) => (
        <label className={`flex flex-col gap-1.5 ${className}`}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{label}</span>
            {children}
        </label>
    );

    const inputClass =
        "w-full rounded-lg border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/35 focus:ring-1 focus:ring-cyan-400/15";

    const selectClass = `${inputClass} cursor-pointer appearance-none pr-10 tabular-nums`;

    const SelectChevron = () => (
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" aria-hidden />
    );
    const shotSlot = (slot: "before" | "after", label: string) => {
        const url = slot === "before" ? form.beforeUrl : form.afterUrl;
        const inputRef = slot === "before" ? beforeInputRef : afterInputRef;
        return (
            <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{label}</span>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        setImageFromFile(f, slot);
                        e.target.value = "";
                    }}
                />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="group relative flex min-h-[132px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/22 bg-black/30 px-3 py-4 text-center transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.04] focus-visible:border-cyan-400/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/20"
                >
                    {url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- blob preview
                        <img
                            src={url}
                            alt=""
                            className="max-h-[200px] w-full rounded-lg object-contain opacity-95"
                        />
                    ) : (
                        <>
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-cyan-300/85 transition group-hover:border-cyan-400/25 group-hover:text-cyan-200">
                                <ImagePlus className="h-5 w-5" aria-hidden />
                            </div>
                            <span className="text-[11px] text-white/40">Нажмите, чтобы прикрепить изображение</span>
                        </>
                    )}
                    <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md border border-white/8 bg-black/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                        <Camera className="h-3 w-3" aria-hidden />
                        {url ? "Заменить" : "Файл"}
                    </span>
                </button>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-cyan-400/22 bg-[linear-gradient(165deg,rgba(14,17,23,0.92),rgba(10,12,18,0.88))] p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_18px_48px_rgba(0,0,0,0.35)] md:p-5">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-white/8 pb-4">
                    <div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
                            <BookOpen className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                            Торговый журнал
                        </div>
                        <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-white/50">
                            Черновой ввод: данные только в этой сессии браузера. Дальше подключим сохранение и синхронизацию.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/25"
                        >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            Новая запись
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.12)] transition hover:bg-cyan-400/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35"
                        >
                            <Save className="h-3.5 w-3.5" aria-hidden />
                            Сохранить
                        </button>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:gap-6">
                    <div className="flex flex-col gap-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Дата">
                                <div className="relative">
                                    <select
                                        value={resolvedDate}
                                        onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                        className={selectClass}
                                    >
                                        {dateSelectOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                    <SelectChevron />
                                </div>
                            </Field>
                            <Field label="Инструмент">
                                <div className="relative">
                                    <select
                                        value={resolvedInstrument}
                                        onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
                                        className={selectClass}
                                    >
                                        {instrumentSelectOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                    <SelectChevron />
                                </div>
                            </Field>
                            <Field label="Таймфрейм">
                                <div className="relative">
                                    <select
                                        value={resolvedTimeframe}
                                        onChange={(e) => setForm((f) => ({ ...f, timeframe: e.target.value }))}
                                        className={selectClass}
                                    >
                                        {timeframeSelectOptions.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                    <SelectChevron />
                                </div>
                            </Field>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-4">
                            <Field label="Уровень входа">
                                <input
                                    inputMode="decimal"
                                    value={form.entry}
                                    onChange={(e) => setForm((f) => ({ ...f, entry: e.target.value }))}
                                    className={`${inputClass} tabular-nums`}
                                    placeholder="68100"
                                />
                            </Field>
                            <Field label="Стоп">
                                <input
                                    inputMode="decimal"
                                    value={form.stop}
                                    onChange={(e) => setForm((f) => ({ ...f, stop: e.target.value }))}
                                    className={`${inputClass} tabular-nums`}
                                    placeholder="67800"
                                />
                            </Field>
                            <Field label="Цель">
                                <input
                                    inputMode="decimal"
                                    value={form.target}
                                    onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                                    className={`${inputClass} tabular-nums`}
                                    placeholder="69500"
                                />
                            </Field>
                            <Field label="Риск (%)">
                                <input
                                    inputMode="decimal"
                                    value={form.riskPct}
                                    onChange={(e) => setForm((f) => ({ ...f, riskPct: e.target.value }))}
                                    className={`${inputClass} tabular-nums`}
                                    placeholder="1.5"
                                />
                            </Field>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">{shotSlot("before", "Скрин до")}{shotSlot("after", "Скрин после")}</div>
                    </div>

                    <aside className="flex min-h-[280px] flex-col rounded-xl border border-white/10 bg-black/28 lg:min-h-0">
                        <div className="border-b border-white/10 px-3 py-2.5">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/85">Журнал</div>
                            <div className="mt-0.5 text-[11px] text-white/45">{sortedTrades.length} записей</div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                            {sortedTrades.length === 0 ? (
                                <p className="px-2 py-6 text-center text-[12px] leading-relaxed text-white/38">
                                    Сохранённые сделки появятся здесь строками. Нажмите строку — поля заполнятся слева.
                                </p>
                            ) : (
                                <ul className="flex flex-col gap-1.5">
                                    {sortedTrades.map((t) => {
                                        const active = editingId === t.id;
                                        return (
                                            <li key={t.id}>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectTrade(t)}
                                                        className={`min-w-0 flex-1 rounded-lg border px-2.5 py-2 text-left text-[11px] leading-snug transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 ${
                                                            active
                                                                ? "border-cyan-400/35 bg-cyan-400/[0.08] text-white/95 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]"
                                                                : "border-white/10 bg-black/25 text-white/72 hover:border-white/16 hover:bg-white/[0.03]"
                                                        }`}
                                                    >
                                                        <span className="line-clamp-2 tabular-nums">{tradeSummaryLine(t)}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Удалить запись"
                                                        onClick={() => handleDelete(t.id)}
                                                        className="shrink-0 rounded-lg border border-white/10 px-2 text-[11px] text-white/45 transition hover:border-rose-400/35 hover:bg-rose-400/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/35"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                        <div className="hidden border-t border-white/10 px-3 py-2 text-[10px] tabular-nums text-white/35 sm:flex sm:flex-wrap sm:justify-between sm:gap-2 lg:flex">
                            <span className="text-cyan-200/55">SESSION</span>
                            <span>JOURNAL_DRAFT · UI_ONLY</span>
                            <span className="truncate">После сохранения: IndexedDB → API</span>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
