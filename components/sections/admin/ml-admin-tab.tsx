"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw, Power, Eye, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";

type Mode = "off" | "shadow" | "on";

interface MlStatus {
    status: string;
    symbol: string;
    mode: Mode;
    data: {
        price_bars: number;
        last_price_ts: string | null;
        predictions_logged: number;
        last_prediction_ts: string | null;
        prediction_age_hours: number | null;
        results_logged: number;
        accumulating: boolean;
        enough_for_training: boolean;
        min_bars_required: number;
    };
    model: {
        exists: boolean;
        trained_at?: string | null;
        n_train?: number;
        n_test?: number;
        test_accuracy?: number;
        heuristic_accuracy?: number;
        majority_accuracy?: number;
        beat_heuristic?: boolean;
    };
    lamps: {
        accumulating: boolean;
        enough_data: boolean;
        model_trained: boolean;
        beat_heuristic: boolean;
        engine_using_ml: boolean;
    };
    gates: { can_train: boolean; can_promote: boolean };
}

function Lamp({ on, label, hint }: { on: boolean; label: string; hint?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex flex-col">
                <span className={on ? "text-[13px] text-white/85" : "text-[13px] text-white/40"}>{label}</span>
                {hint && <span className="text-[10px] text-white/30">{hint}</span>}
            </div>
            <span
                className={`h-3 w-3 shrink-0 rounded-full border transition ${
                    on
                        ? "border-emerald-400/80 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]"
                        : "border-white/15 bg-transparent"
                }`}
            />
        </div>
    );
}

function pct(v: number | undefined | null): string {
    return v === undefined || v === null ? "—" : `${(v * 100).toFixed(1)}%`;
}

export function MlAdminTab() {
    const [st, setSt] = useState<MlStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [training, setTraining] = useState(false);
    const [modePending, setModePending] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/ml/status", { cache: "no-store" });
            const j = await res.json();
            if (res.ok) setSt(j);
            else setMsg(j?.detail || j?.error || "Ошибка загрузки статуса");
        } catch {
            setMsg("Сеть недоступна");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function handleTrain() {
        setTraining(true);
        setMsg("Обучение запущено — это может занять до минуты…");
        try {
            const res = await fetch("/api/admin/ml/train", { method: "POST" });
            const j = await res.json();
            if (res.ok) {
                const r = j.result || {};
                if (r.status === "ok") {
                    setMsg(
                        `Готово: ML ${pct(r.test_accuracy)} vs эвристика ${pct(r.heuristic_accuracy)} — ` +
                            (r.beat_heuristic ? "обыграла ✓" : "не обыграла"),
                    );
                } else {
                    setMsg(`Недостаточно данных для обучения (${r.samples ?? "?"} примеров)`);
                }
                if (j.panel) setSt(j.panel);
            } else {
                setMsg(j?.detail || j?.error || "Ошибка обучения");
            }
        } catch {
            setMsg("Ошибка сети при обучении");
        } finally {
            setTraining(false);
        }
    }

    async function handleMode(mode: Mode) {
        setModePending(true);
        setMsg(null);
        try {
            const res = await fetch(`/api/admin/ml/mode?mode=${mode}`, { method: "POST" });
            const j = await res.json();
            if (res.ok) {
                if (j.panel) setSt(j.panel);
                setMsg(`Режим переключён: ${mode.toUpperCase()}`);
            } else {
                setMsg(j?.detail || j?.error || "Не удалось переключить режим");
            }
        } catch {
            setMsg("Ошибка сети");
        } finally {
            setModePending(false);
            setTimeout(() => setMsg(null), 5000);
        }
    }

    if (loading) {
        return <div className="py-10 text-center text-[12px] text-white/30">Загрузка ML-статуса…</div>;
    }

    const mode = st?.mode ?? "off";
    const canPromote = st?.gates.can_promote ?? false;
    const modeBadge =
        mode === "on"
            ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
            : mode === "shadow"
              ? "border-amber-400/40 bg-amber-400/15 text-amber-200"
              : "border-white/15 bg-white/[0.04] text-white/45";

    return (
        <div className="flex flex-col gap-4">
            {/* Header / current mode */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-cyan-300/80" />
                    <span className="text-[12px] font-semibold text-white/80">ML-движок 24H · {st?.symbol}</span>
                </div>
                <span className={`rounded-lg border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${modeBadge}`}>
                    Режим: {mode}
                </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                {/* Lamps */}
                <Card title="Состояние" subtitle="Индикаторы готовности">
                    <div className="divide-y divide-white/6">
                        <Lamp on={st!.lamps.accumulating} label="Данные копятся" hint={`${st!.data.predictions_logged} прогнозов · последний ${st!.data.prediction_age_hours ?? "—"} ч назад`} />
                        <Lamp on={st!.lamps.enough_data} label="Данных достаточно для обучения" hint={`${st!.data.price_bars} / ${st!.data.min_bars_required} баров`} />
                        <Lamp on={st!.lamps.model_trained} label="Модель обучена" hint={st!.model.trained_at ? `обучена ${new Date(st!.model.trained_at).toLocaleString("ru-RU")}` : "ещё не обучалась"} />
                        <Lamp on={st!.lamps.beat_heuristic} label="Обыграла эвристику (out-of-sample)" hint={`ML ${pct(st!.model.test_accuracy)} vs эвристика ${pct(st!.model.heuristic_accuracy)}`} />
                        <Lamp on={st!.lamps.engine_using_ml} label="Движок использует ML в проде" hint={mode === "on" ? "боевой режим" : mode === "shadow" ? "тень (live = эвристика)" : "выключено"} />
                    </div>
                </Card>

                {/* Controls */}
                <Card title="Управление" subtitle="Обучение и допуск в движок">
                    <div className="flex flex-col gap-4">
                        {/* Train */}
                        <div>
                            <button
                                type="button"
                                onClick={handleTrain}
                                disabled={training || !st?.gates.can_train}
                                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[12px] font-semibold text-cyan-200 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <RefreshCw className={`h-4 w-4 ${training ? "animate-spin" : ""}`} />
                                {training ? "Обучение…" : "Обучить / переобучить модель"}
                            </button>
                            {!st?.gates.can_train && (
                                <p className="mt-1.5 text-[10px] text-white/30">Недостаточно данных для обучения</p>
                            )}
                        </div>

                        {/* Mode switch */}
                        <div>
                            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35">Режим работы</div>
                            <div className="grid grid-cols-3 gap-2">
                                <ModeBtn icon={<Power className="h-4 w-4" />} label="Выкл" active={mode === "off"} disabled={modePending} onClick={() => handleMode("off")} tone="off" />
                                <ModeBtn icon={<Eye className="h-4 w-4" />} label="Тень" active={mode === "shadow"} disabled={modePending} onClick={() => handleMode("shadow")} tone="shadow" />
                                <ModeBtn icon={<Zap className="h-4 w-4" />} label="Боевой" active={mode === "on"} disabled={modePending || !canPromote} onClick={() => handleMode("on")} tone="on" />
                            </div>
                            {!canPromote && (
                                <p className="mt-1.5 text-[10px] text-amber-300/50">
                                    «Боевой» заблокирован: модель должна обучиться и обыграть эвристику (ворота закрыты).
                                </p>
                            )}
                            <ul className="mt-2 space-y-0.5 text-[10px] text-white/30">
                                <li><b className="text-white/45">Выкл</b> — работает эвристика (по умолчанию)</li>
                                <li><b className="text-white/45">Тень</b> — эвристика в проде, ML считается рядом для сравнения</li>
                                <li><b className="text-white/45">Боевой</b> — ML заменяет эвристику в живом сигнале</li>
                            </ul>
                        </div>

                        {msg && <p className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-white/60">{msg}</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
}

function ModeBtn({
    icon, label, active, disabled, onClick, tone,
}: {
    icon: React.ReactNode; label: string; active: boolean; disabled?: boolean; onClick: () => void; tone: "off" | "shadow" | "on";
}) {
    const toneCls = active
        ? tone === "on"
            ? "border-emerald-400/45 bg-emerald-400/15 text-emerald-200"
            : tone === "shadow"
              ? "border-amber-400/45 bg-amber-400/15 text-amber-200"
              : "border-white/25 bg-white/10 text-white/80"
        : "border-white/10 bg-white/[0.03] text-white/40 hover:text-white/60";
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${toneCls}`}
        >
            {icon}
            {label}
        </button>
    );
}
