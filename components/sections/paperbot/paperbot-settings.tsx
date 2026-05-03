"use client";

import { Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PaperSettings } from "@/components/sections/paperbot/types";

type Props = {
    settings: PaperSettings;
    onChange: (s: PaperSettings) => void;
    disabled?: boolean;
};

const RISK_OPTIONS = [0.5, 1, 1.5, 2, 3, 5];
const LEVERAGE_OPTIONS = [5, 10, 20];
const CONFIDENCE_OPTIONS: Array<PaperSettings["minConfidence"]> = ["low", "medium", "high"];
const PROB_OPTIONS = [52, 55, 60, 65, 70, 75];
const MAX_POS_OPTIONS = [1, 2, 3];

function RowLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">{children}</div>
    );
}

function SelectPill<T extends string | number>({
    options,
    value,
    onChange,
    fmt,
    disabled,
}: {
    options: T[];
    value: T;
    onChange: (v: T) => void;
    fmt?: (v: T) => string;
    disabled?: boolean;
}) {
    return (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
            {options.map((o) => {
                const active = o === value;
                return (
                    <button
                        key={String(o)}
                        onClick={() => !disabled && onChange(o)}
                        disabled={disabled}
                        className={`rounded border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            active
                                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                                : "border-white/10 bg-white/[0.04] text-white/50 hover:border-white/20 hover:text-white/70"
                        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    >
                        {fmt ? fmt(o) : String(o)}
                    </button>
                );
            })}
        </div>
    );
}

export function PaperbotSettings({ settings, onChange, disabled }: Props) {
    const riskUsd = ((settings.depositUsd * settings.riskPct) / 100).toFixed(0);

    return (
        <Card
            className="flex h-full min-h-0 flex-col border-emerald-500/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
            title="Параметры бота"
            subtitle="Фильтры входа и управление риском"
            right={
                <div className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/45">
                    <Settings2 className="h-3.5 w-3.5" aria-hidden />
                    Config
                </div>
            }
        >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
                {/* Deposit */}
                <div>
                    <RowLabel>Депозит ($)</RowLabel>
                    <div className="mt-1.5 flex items-center gap-2">
                        <input
                            type="number"
                            min={100}
                            max={100_000}
                            step={100}
                            value={settings.depositUsd}
                            disabled={disabled}
                            onChange={(e) =>
                                onChange({ ...settings, depositUsd: Number(e.target.value) || settings.depositUsd })
                            }
                            className="w-32 rounded border border-white/12 bg-black/35 px-2.5 py-1.5 text-[12px] tabular-nums text-white/80 outline-none focus:border-emerald-400/40 disabled:opacity-50"
                        />
                        <span className="text-[11px] text-white/35">USD · виртуальные средства</span>
                    </div>
                </div>

                {/* Risk per trade */}
                <div>
                    <RowLabel>Риск на сделку (%)</RowLabel>
                    <SelectPill
                        options={RISK_OPTIONS}
                        value={settings.riskPct}
                        onChange={(v) => onChange({ ...settings, riskPct: v })}
                        fmt={(v) => `${v}%`}
                        disabled={disabled}
                    />
                    <div className="mt-1 text-[10px] text-white/35">
                        ≈ ${riskUsd} от депозита · максимальный убыток на позицию
                    </div>
                </div>

                {/* Leverage */}
                <div>
                    <RowLabel>Плечо</RowLabel>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <button
                            disabled={disabled}
                            onClick={() => onChange({ ...settings, leverageEnabled: !settings.leverageEnabled })}
                            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                !settings.leverageEnabled
                                    ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
                                    : "border-white/10 bg-white/[0.04] text-white/35"
                            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                            <span className={`h-2 w-2 rounded-full ${!settings.leverageEnabled ? "bg-amber-400" : "bg-white/20"}`} />
                            Без плеча
                        </button>
                        {settings.leverageEnabled && (
                            <SelectPill
                                options={LEVERAGE_OPTIONS}
                                value={settings.leverage}
                                onChange={(v) => onChange({ ...settings, leverage: v })}
                                fmt={(v) => `${v}x`}
                                disabled={disabled}
                            />
                        )}
                    </div>
                    {!settings.leverageEnabled && (
                        <div className="mt-1 text-[10px] text-white/35">
                            Спот-режим · leverage = 1x · PnL считается от полной суммы
                        </div>
                    )}
                </div>

                {/* Min confidence */}
                <div>
                    <RowLabel>Минимальная уверенность</RowLabel>
                    <SelectPill
                        options={CONFIDENCE_OPTIONS}
                        value={settings.minConfidence}
                        onChange={(v) => onChange({ ...settings, minConfidence: v })}
                        fmt={(v) => v === "high" ? "HIGH" : v === "medium" ? "MEDIUM" : "LOW"}
                        disabled={disabled}
                    />
                    <div className="mt-1 text-[10px] text-white/35">
                        HIGH ≥ 75% · MEDIUM ≥ 62% · LOW — любой сигнал
                    </div>
                </div>

                {/* Min probability */}
                <div>
                    <RowLabel>Минимальная вероятность (%)</RowLabel>
                    <SelectPill
                        options={PROB_OPTIONS}
                        value={settings.minProbabilityPct}
                        onChange={(v) => onChange({ ...settings, minProbabilityPct: v })}
                        fmt={(v) => `≥${v}%`}
                        disabled={disabled}
                    />
                </div>

                {/* Directions */}
                <div>
                    <RowLabel>Допустимые направления</RowLabel>
                    <div className="mt-1.5 flex gap-2">
                        <button
                            disabled={disabled}
                            onClick={() => onChange({ ...settings, allowLong: !settings.allowLong })}
                            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                settings.allowLong
                                    ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                                    : "border-white/10 bg-white/[0.04] text-white/35"
                            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${
                                    settings.allowLong ? "bg-emerald-400" : "bg-white/20"
                                }`}
                            />
                            LONG
                        </button>
                        <button
                            disabled={disabled}
                            onClick={() => onChange({ ...settings, allowShort: !settings.allowShort })}
                            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                                settings.allowShort
                                    ? "border-rose-400/40 bg-rose-400/15 text-rose-200"
                                    : "border-white/10 bg-white/[0.04] text-white/35"
                            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        >
                            <span
                                className={`h-2 w-2 rounded-full ${
                                    settings.allowShort ? "bg-rose-400" : "bg-white/20"
                                }`}
                            />
                            SHORT
                        </button>
                    </div>
                </div>

                {/* Max positions */}
                <div>
                    <RowLabel>Макс. одновременных позиций</RowLabel>
                    <SelectPill
                        options={MAX_POS_OPTIONS}
                        value={settings.maxPositions}
                        onChange={(v) => onChange({ ...settings, maxPositions: v })}
                        disabled={disabled}
                    />
                </div>

                {disabled && (
                    <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-[11px] text-amber-200/60">
                        Настройки заблокированы во время работы бота. Остановите бота для изменения параметров.
                    </div>
                )}
            </div>
        </Card>
    );
}
