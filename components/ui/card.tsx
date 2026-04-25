import { ReactNode } from "react";

type CardProps = {
    title?: string;
    subtitle?: string;
    right?: ReactNode;
    children: ReactNode;
    className?: string;
    padded?: boolean;
};

export function Card({ title, subtitle, right, children, className = "", padded = true }: CardProps) {
    return (
        <section
            className={`rounded-2xl border border-white/8 bg-[#0E1117]/80 ${padded ? "p-4" : ""} ${className}`}
        >
            {(title || right) && (
                <header className="relative mb-3 flex items-center justify-between gap-2 overflow-visible">
                    <div className="min-w-0">
                        {title && (
                            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                                {title}
                            </div>
                        )}
                        {subtitle && (
                            <div className="mt-0.5 text-[11px] text-white/50">{subtitle}</div>
                        )}
                    </div>
                    {right}
                </header>
            )}
            {children}
        </section>
    );
}

export function StatCell({
    label,
    value,
    sub,
    tone = "default",
}: {
    label: string;
    value: ReactNode;
    sub?: ReactNode;
    tone?: "default" | "long" | "short" | "info" | "warn";
}) {
    const toneClass =
        tone === "long"
            ? "text-emerald-400"
            : tone === "short"
            ? "text-rose-400"
            : tone === "info"
            ? "text-cyan-300"
            : tone === "warn"
            ? "text-amber-300"
            : "text-white";

    return (
        <div className="rounded-lg border border-white/8 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</div>
            <div className={`mt-1.5 text-lg font-semibold tabular-nums tracking-tight ${toneClass}`}>
                {value}
            </div>
            {sub && <div className="mt-0.5 text-[11px] text-white/45">{sub}</div>}
        </div>
    );
}
