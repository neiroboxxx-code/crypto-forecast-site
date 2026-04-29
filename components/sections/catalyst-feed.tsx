"use client";

import { useEffect, useMemo, useState } from "react";
import { getNews, type NewsData, type NewsItem } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { fmtTime } from "@/lib/format";

// ─── Конфиг ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "catalyst-feed:v1:locked-day";
const STALE_THRESHOLD_H = 28; // плановый цикл 24h + 4h буфер
const REFRESH_MS = 60 * 60 * 1000; // суточный пайплайн → раз в час хватает с запасом
const RELEVANCE_MIN = 0.5; // отрезает валютные пары без BTC-релевантности
const QUOTAS = { crypto: 2, geo: 2, macro: 1 } as const;

// ─── Типы и утилиты выборки ────────────────────────────────────────────────
type Category = "crypto" | "geo" | "macro";
type Stored = { day: string; updated_at: string; items: NewsItem[] };

function categorize(item: NewsItem): Category {
    const k = (item.event_key ?? "").toLowerCase();
    if (k.includes("crypto") || k.includes("btc") || k.includes("eth")) return "crypto";
    if (k.startsWith("geopolitics")) return "geo";
    return "macro";
}

function sentimentValue(s: NewsItem["sentiment"]): number {
    if (typeof s === "number") return s;
    if (s === "bullish") return 1;
    if (s === "bearish") return -1;
    return 0;
}

function hasMeaningfulBadge(item: NewsItem): boolean {
    const reg = item.market_regime_effect;
    if (reg === "risk_off" || reg === "risk_on" || reg === "macro_uncertainty") return true;
    return Math.abs(sentimentValue(item.sentiment)) > 0.12;
}

function ageDays(publishedAt: string): number {
    const t = Date.parse(publishedAt);
    if (Number.isNaN(t)) return 999;
    return Math.max(0, (Date.now() - t) / 86_400_000);
}

function scoreItem(item: NewsItem): number {
    const impact = item.impact_score ?? 0;
    const rel = item.btc_relevance_score ?? 0;
    const conf = item.is_confirmed ? 0.1 : 0;
    return impact * 0.6 + rel * 0.3 + conf - 0.1 * ageDays(item.published_at);
}

function pickTop(all: NewsItem[], total: number): NewsItem[] {
    const eligible = all.filter(
        (it) => (it.btc_relevance_score ?? 0) >= RELEVANCE_MIN && hasMeaningfulBadge(it),
    );

    const ranked = [...eligible].sort((a, b) => {
        const sa = scoreItem(a);
        const sb = scoreItem(b);
        if (sb !== sa) return sb - sa;
        return Date.parse(b.published_at) - Date.parse(a.published_at);
    });

    const selected: NewsItem[] = [];
    const used = new Set<NewsItem>();

    // Сначала набираем по категорийным квотам — стараемся разнести крипто / гео / макро.
    (Object.keys(QUOTAS) as Category[]).forEach((cat) => {
        const quota = QUOTAS[cat];
        let taken = 0;
        for (const it of ranked) {
            if (taken >= quota) break;
            if (used.has(it)) continue;
            if (categorize(it) === cat) {
                selected.push(it);
                used.add(it);
                taken++;
            }
        }
    });

    // Если каких-то категорий не хватило — добиваем оставшимися top-by-score.
    for (const it of ranked) {
        if (selected.length >= total) break;
        if (used.has(it)) continue;
        selected.push(it);
        used.add(it);
    }

    return selected.slice(0, total);
}

function dayKey(updatedAt: string): string {
    return (updatedAt || "").slice(0, 10);
}

function readStored(): Stored | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Stored;
        if (parsed && typeof parsed.day === "string" && Array.isArray(parsed.items)) return parsed;
    } catch {
        // невалидный JSON / quota — просто игнорируем кеш
    }
    return null;
}

function writeStored(value: Stored) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
        // quota / private mode — не критично
    }
}

// ─── Бейджи ─────────────────────────────────────────────────────────────────
function sentimentBadge(s: NewsItem["sentiment"]): { label: string; cls: string } | null {
    const val = sentimentValue(s);
    if (val > 0.12) return { label: "BULL", cls: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" };
    if (val < -0.12) return { label: "BEAR", cls: "border-rose-400/25 bg-rose-400/10 text-rose-300" };
    return null;
}

function regimeBadge(v: string | null | undefined): { label: string; cls: string } | null {
    if (v === "risk_off") return { label: "RISK-OFF", cls: "border-amber-400/25 bg-amber-400/10 text-amber-300" };
    if (v === "risk_on") return { label: "RISK-ON", cls: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300" };
    if (v === "macro_uncertainty") return { label: "MACRO", cls: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300" };
    return null;
}

// ─── Индикатор состояния ────────────────────────────────────────────────────
type FeedStatus = "ok" | "stale" | "unknown";

function getFeedStatus(updatedAt: string | undefined): { status: FeedStatus; label: string } {
    if (!updatedAt) return { status: "unknown", label: "Нет данных об обновлении" };
    const ageH = (Date.now() - Date.parse(updatedAt)) / 3_600_000;
    if (ageH <= STALE_THRESHOLD_H)
        return { status: "ok", label: `Обновлено ${fmtTime(updatedAt)}` };
    return { status: "stale", label: `Просрочено · последнее ${fmtTime(updatedAt)}` };
}

function StatusDot({ updatedAt }: { updatedAt: string | undefined }) {
    const { status, label } = getFeedStatus(updatedAt);
    const color =
        status === "ok" ? "bg-emerald-400" : status === "stale" ? "bg-rose-500" : "bg-white/25";
    return (
        <span className="relative flex h-2 w-2 shrink-0" title={label}>
            {status === "ok" && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
        </span>
    );
}

// ─── Компонент ──────────────────────────────────────────────────────────────
type CatalystFeedProps = { maxItems?: number };

export function CatalystFeed({ maxItems = 5 }: CatalystFeedProps) {
    const { data, loading, error } = useApi<NewsData>(getNews, [], { intervalMs: REFRESH_MS });
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [infoOpen, setInfoOpen] = useState(false);
    const [stored, setStored] = useState<Stored | null>(null);

    // Подтягиваем кеш предыдущего выпуска один раз на маунте — чтобы лента не была пустой.
    useEffect(() => {
        setStored(readStored());
    }, []);

    // При каждом обновлении data решаем: фиксируем новый выпуск или оставляем прежний.
    useEffect(() => {
        if (!data) return;
        const newDay = dayKey(data.updated_at ?? "");
        if (!newDay) return;
        if (stored) {
            // Текущий выпуск дня — заморожен, бэкенд может качаться сколько угодно.
            if (stored.day === newDay) return;
            // Защита от регресса: бэкенд иногда переписывает файл старыми данными.
            if (newDay < stored.day) return;
        }
        const picked = pickTop(data.items ?? [], maxItems);
        if (picked.length === 0) return; // не сохраняем пустой набор — оставляем что было
        const next: Stored = { day: newDay, updated_at: data.updated_at, items: picked };
        setStored(next);
        writeStored(next);
    }, [data, stored, maxItems]);

    // Что реально показываем: сначала зафиксированный выпуск, иначе — свежевычисленный из data.
    const itemsToShow = useMemo<NewsItem[]>(() => {
        if (stored && stored.items.length > 0) return stored.items.slice(0, maxItems);
        if (data) return pickTop(data.items ?? [], maxItems);
        return [];
    }, [stored, data, maxItems]);

    const showSkeleton = loading && itemsToShow.length === 0;
    const showError = !!error && itemsToShow.length === 0;

    const feedUpdatedAt = data?.updated_at ?? stored?.updated_at;

    return (
        <>
            <Card
                title="Catalyst Feed"
                subtitle="Macro headlines"
                right={
                    <div className="flex items-center gap-2">
                        <StatusDot updatedAt={feedUpdatedAt} />
                        <InfoIconButton
                            onClick={() => setInfoOpen(true)}
                            label="Показать пояснение к Catalyst Feed"
                        />
                    </div>
                }
            >
                {showSkeleton && (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                )}

                {showError && <ErrorState message={error ?? "Не удалось загрузить новости"} />}

                {itemsToShow.length > 0 && (
                    <div className="space-y-2">
                        {itemsToShow.map((item, idx) => {
                            const key = `${item.event_key ?? item.url ?? item.title}-${idx}`;
                            const isOpen = openKey === key;
                            const sent = sentimentBadge(item.sentiment);
                            const reg = regimeBadge(item.market_regime_effect);
                            return (
                                <article
                                    key={key}
                                    className="rounded-lg border border-white/8 bg-black/30 p-2.5 transition hover:border-white/15"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenKey(isOpen ? null : key)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                                            {reg && (
                                                <span className={`rounded border px-1.5 py-0.5 ${reg.cls}`}>
                                                    {reg.label}
                                                </span>
                                            )}
                                            {sent && (
                                                <span className={`rounded border px-1.5 py-0.5 ${sent.cls}`}>
                                                    {sent.label}
                                                </span>
                                            )}
                                            {item.is_confirmed && (
                                                <span className="rounded border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300">
                                                    CONF
                                                </span>
                                            )}
                                            <span className="ml-auto tabular-nums text-white/35">
                                                {fmtTime(item.published_at)}
                                            </span>
                                        </div>
                                        <h3 className="mt-1.5 text-[12px] leading-5 text-white/85">
                                            {item.title}
                                        </h3>
                                    </button>

                                    {isOpen && (
                                        <div className="mt-2 border-t border-white/6 pt-2 text-[11px] leading-5 text-white/55">
                                            <p>{item.summary}</p>
                                            <div className="mt-2 flex items-center justify-between text-[10px] text-white/40">
                                                <span>{item.source}</span>
                                                {item.url && (
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-white/65 hover:bg-white/10"
                                                    >
                                                        Open ↗
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </Card>

            <InfoDialog
                open={infoOpen}
                onClose={() => setInfoOpen(false)}
                title="Catalyst Feed"
                subtitle="Ежедневный выпуск из 5 макро/гео-новостей, способных двигать рынок"
            >
                <p>
                    Лента собирается раз в сутки и держится до следующего обновления. Промежуточные
                    перезаписи на стороне пайплайна не сбивают выпуск дня — мы запоминаем его на клиенте.
                </p>
                <p className="mt-2">
                    На фронте включён жёсткий фильтр: остаются только новости с явным режимом рынка
                    (RISK-OFF / RISK-ON / MACRO) или выраженным тоном (BULL / BEAR), и достаточной
                    BTC-релевантностью. Из них набирается смешанный топ-5: до 2 крипто, до 2 гео,
                    1 макро (если в выпуске чего-то нет — слот заполняется самым «громким» резервом).
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Как читать бейджи
                </h4>
                <ul className="mt-2 space-y-1.5">
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300">
                            RISK-OFF
                        </span>
                        <span>рынок уходит в защиту, давление на риск-активы — включая крипту.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-cyan-300">
                            RISK-ON
                        </span>
                        <span>аппетит к риску растёт, акции и крипта на ходу.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded border border-fuchsia-400/25 bg-fuchsia-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-fuchsia-300">
                            MACRO
                        </span>
                        <span>макро-неопределённость: ставки, инфляция, политика без явного направления.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-300">
                            BULL
                        </span>
                        <span>позитивный тон самой новости.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded border border-rose-400/25 bg-rose-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-rose-300">
                            BEAR
                        </span>
                        <span>негативный тон.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0 rounded border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-300">
                            CONF
                        </span>
                        <span>событие подтверждено первоисточником.</span>
                    </li>
                </ul>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Как пользоваться
                </h4>
                <ul className="mt-2 space-y-1.5">
                    <li>Время справа — UTC публикации.</li>
                    <li>Клик по заголовку раскрывает саммари, источник и ссылку на оригинал.</li>
                    <li>Несколько RISK-OFF подряд — повод осторожнее с long-сигналами.</li>
                    <li>Новости без бейджей не показываются — пропадают «голые» нейтралки.</li>
                </ul>

                <p className="mt-4 text-xs text-white/50">
                    Лента — контекст, а не торговый сигнал.
                </p>
            </InfoDialog>
        </>
    );
}
