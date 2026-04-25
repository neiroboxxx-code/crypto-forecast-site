"use client";

import { useState } from "react";
import { getNews, type NewsData, type NewsItem } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { InfoDialog, InfoIconButton } from "@/components/ui/info-dialog";
import { fmtTime } from "@/lib/format";

function sentimentBadge(s: NewsItem["sentiment"]): { label: string; cls: string } {
    let val = 0;
    if (typeof s === "number") val = s;
    else if (s === "bullish") val = 1;
    else if (s === "bearish") val = -1;

    if (val > 0.12) return { label: "BULL", cls: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" };
    if (val < -0.12) return { label: "BEAR", cls: "border-rose-400/25 bg-rose-400/10 text-rose-300" };
    return { label: "NEUT", cls: "border-white/12 bg-white/5 text-white/55" };
}

function regimeBadge(v: string | null | undefined): { label: string; cls: string } | null {
    if (v === "risk_off") return { label: "RISK-OFF", cls: "border-amber-400/25 bg-amber-400/10 text-amber-300" };
    if (v === "risk_on") return { label: "RISK-ON", cls: "border-cyan-400/25 bg-cyan-400/10 text-cyan-300" };
    if (v === "macro_uncertainty") return { label: "MACRO", cls: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-300" };
    return null;
}

type CatalystFeedProps = {
    maxItems?: number;
};

export function CatalystFeed({ maxItems = 6 }: CatalystFeedProps) {
    const { data, loading, error } = useApi<NewsData>(getNews);
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [infoOpen, setInfoOpen] = useState(false);

    return (
        <>
            <Card
                title="Catalyst Feed"
                subtitle="Macro headlines"
                right={
                    <InfoIconButton
                        onClick={() => setInfoOpen(true)}
                        label="Показать пояснение к Catalyst Feed"
                    />
                }
            >
                {loading && (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                )}

                {error && <ErrorState message={error} />}

                {data && (
                    <div className="space-y-2">
                        {data.items.slice(0, maxItems).map((item, idx) => {
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
                                            <span className={`rounded border px-1.5 py-0.5 ${sent.cls}`}>
                                                {sent.label}
                                            </span>
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
                subtitle="Лента макро-новостей, которые могут двигать рынок"
            >
                <p>
                    Это поток заголовков, отфильтрованных по влиянию на крипту: ставки ФРС,
                    инфляция, занятость, геополитика, регуляторика, крупные события вокруг
                    BTC и ETH. Каждой новости проставляется тон и режим, в который она
                    толкает рынок.
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                    Как пользоваться
                </h4>
                <ul className="mt-2 space-y-1.5">
                    <li>Время справа — когда новость опубликована.</li>
                    <li>Клик по заголовку раскрывает короткое саммари, источник и ссылку на оригинал.</li>
                    <li>Несколько RISK-OFF подряд — повод читать long-сигналы осторожнее.</li>
                </ul>

                <p className="mt-4 text-xs text-white/50">
                    Лента — контекст, а не торговый сигнал.
                </p>
            </InfoDialog>
        </>
    );
}
