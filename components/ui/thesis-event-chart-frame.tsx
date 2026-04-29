import type { ImgHTMLAttributes, ReactNode } from "react";

/**
 * Общий HUD-стиль снимков исторических событий (совпадает с эстетикой слайдов ВВЕДЕНИЕ / Level 3):
 * тонкая бирюза, tech-бары — без изменения содержимого PNG.
 */

const shellCn =
    "relative overflow-hidden rounded-[10px] border border-cyan-400/[0.32] bg-gradient-to-b from-[#0C101A]/98 via-[#0A0D13]/97 to-[#080B10]/98 shadow-[inset_0_1px_0_rgba(34,211,238,0.07),0_14px_48px_-20px_rgba(0,0,0,0.85)]";
const hudBarCn =
    "flex items-center justify-between gap-2 border-b border-cyan-400/14 bg-black/45 px-2.5 py-1 backdrop-blur-[2px]";
const hudMuted = "text-[8.5px] font-medium uppercase tracking-[0.22em] text-cyan-200/45";

type Props = {
    /** Короткая подпись верхней полосы (например «Событие 2 · BTCUSDT · 4H») */
    hudTitle?: string;
    /** Альтернативная строка справа в шапке */
    hudAside?: string;
    children: ReactNode;
    className?: string;
};

function CornerHudTicks() {
    return (
        <>
            <span
                className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-tl-[2px] border-l border-t border-cyan-400/[0.45]"
                aria-hidden
            />
            <span
                className="pointer-events-none absolute right-1 top-1 h-4 w-4 rounded-tr-[2px] border-r border-t border-cyan-400/[0.45]"
                aria-hidden
            />
            <span
                className="pointer-events-none absolute bottom-1 left-1 h-4 w-4 rounded-bl-[2px] border-b border-l border-cyan-400/[0.35]"
                aria-hidden
            />
            <span
                className="pointer-events-none absolute bottom-1 right-1 h-4 w-4 rounded-br-[2px] border-b border-r border-cyan-400/[0.35]"
                aria-hidden
            />
        </>
    );
}

export function ThesisEventChartFrame({ hudTitle, hudAside, children, className = "" }: Props) {
    return (
        <figure className={`thesis-event-chart-frame group/thesis-chart mx-auto w-full max-w-full ${className}`.trim()}>
            <div className={shellCn}>
                <CornerHudTicks />
                <div className="pointer-events-none absolute inset-[1px] rounded-[9px] ring-1 ring-inset ring-white/[0.04]" aria-hidden />
                <header className={hudBarCn}>
                    <span className={`${hudMuted} min-w-0 truncate font-mono`}>
                        {hudTitle ?? "REVERSAL · SNAPSHOT · ENGINE"}
                    </span>
                    <span className={`shrink-0 font-mono ${hudMuted}`}>
                        {hudAside ?? "HIST MODE · LIVE DATA"}
                    </span>
                </header>
                <div className="relative bg-[linear-gradient(180deg,rgba(6,8,12,0.88)_0%,rgba(7,10,16,0.95)_55%,rgba(5,8,13,1)_100%)] p-2 sm:p-2.5">
                    <div className="rounded-md border border-white/[0.06] bg-[#070911]/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        {children}
                    </div>
                </div>
                <footer className="flex items-center justify-center border-t border-white/[0.06] bg-black/30 py-1">
                    <span className="font-mono text-[7.5px] uppercase tracking-[0.35em] text-white/22">
                        market structure · reversal engine
                    </span>
                </footer>
            </div>
        </figure>
    );
}

type ThesisEventChartImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "className"> & {
    className?: string;
};

export function ThesisEventChartImg(props: ThesisEventChartImgProps) {
    const { alt, loading, className, ...rest } = props;
    return (
        // eslint-disable-next-line @next/next/no-img-element -- динамические URL со snapshot API вне домена сборки.
        <img
            {...rest}
            alt={alt ?? ""}
            loading={loading ?? "lazy"}
            className={`mx-auto block h-auto max-h-[min(78vh,900px)] w-full max-w-full rounded-[6px] object-contain opacity-[0.98] ${className ?? ""}`}
        />
    );
}

/** Разрешённые URL картинок в thesis (сообщение LLM + снимки API). */
export function sanitizeThesisImgUrl(raw: string): string | null {
    const url = raw.trim().replace(/^<|>$/g, "");
    if (!url) return null;
    if (/^\/[a-zA-Z0-9_%\-./?&=#]+$/.test(url)) return url;
    try {
        const u = new URL(url);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        return u.href;
    } catch {
        return null;
    }
}

/** Статическая разметка для вставки из `renderMarkdown` (классы синхронизированы с `ThesisEventChartFrame`). */
export function thesisEventFigureHtmlForMarkdown(imgUrl: string, alt: string): string {
    const safeAlt = alt
        ? alt
              .replace(/&/g, "&amp;")
              .replace(/"/g, "&quot;")
              .replace(/</g, "&lt;")
              .trim()
        : "";
    const safe = sanitizeThesisImgUrl(imgUrl);
    if (!safe) return "";

    /* HTML-escape src для атрибута src (единственное место, где он не уже из URL API). */
    const safeEsc = escapeAttr(safe);

    /* Внешний figure — см. ThesisEventChartFrame / shellCn */
    return (
        `<figure class="thesis-event-chart-frame group/thesis-chart mx-auto my-3 w-full max-w-full" role="group">` +
        `<div class="relative overflow-hidden rounded-[10px] border border-cyan-400/30 bg-gradient-to-b from-[#0C101A]/98 via-[#0A0D13]/97 to-[#080B10]/98 shadow-[inset_0_1px_0_rgba(34,211,238,0.07),0_14px_48px_-20px_rgba(0,0,0,0.85)]">` +
        `<span class="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-tl-[2px] border-l border-t border-cyan-400/45"></span>` +
        `<span class="pointer-events-none absolute right-1 top-1 h-4 w-4 rounded-tr-[2px] border-r border-t border-cyan-400/45"></span>` +
        `<span class="pointer-events-none absolute bottom-1 left-1 h-4 w-4 rounded-bl-[2px] border-b border-l border-cyan-400/35"></span>` +
        `<span class="pointer-events-none absolute bottom-1 right-1 h-4 w-4 rounded-br-[2px] border-b border-r border-cyan-400/35"></span>` +
        `<div class="pointer-events-none absolute inset-[1px] rounded-[9px] ring-1 ring-inset ring-white/5"></div>` +
        `<header class="flex items-center justify-between gap-2 border-b border-cyan-400/15 bg-black/45 px-2.5 py-1 backdrop-blur-[2px]">` +
        `<span class="text-[8.5px] font-medium uppercase tracking-[0.22em] text-cyan-200/45 truncate min-w-0 font-mono">${safeAlt ? `SNAPSHOT · ${safeAlt}` : "REVERSAL · SNAPSHOT · ENGINE"}</span>` +
        `<span class="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.22em] text-cyan-200/45">HIST MODE · LIVE DATA</span>` +
        `</header>` +
        `<div class="relative bg-gradient-to-b from-[rgba(6,8,12,0.88)] via-[rgba(7,10,16,0.95)] to-[rgb(5,8,13)] p-2 sm:p-2.5">` +
        `<div class="rounded-md border border-white/6 bg-[#070911]/90 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">` +
        `<img src="${safeEsc}" alt="${safeAlt}" loading="lazy" class="mx-auto block h-auto max-w-full rounded-[6px] object-contain opacity-[0.98]" />` +
        `</div></div>` +
        `<footer class="flex items-center justify-center border-t border-white/6 bg-black/30 py-1">` +
        `<span class="font-mono text-[7.5px] uppercase tracking-[0.35em] text-white/22">market structure · reversal engine</span>` +
        `</footer></div></figure>`
    );
}

function escapeAttr(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/"/g, "&quot;");
}
