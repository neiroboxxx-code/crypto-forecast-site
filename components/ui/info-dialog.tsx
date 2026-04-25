"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";

type InfoIconButtonProps = {
    onClick: (e: React.MouseEvent) => void;
    label: string;
    interactive?: boolean;
};

export function InfoIconButton({ onClick, label, interactive = true }: InfoIconButtonProps) {
    const baseCls =
        "rounded-full p-1 text-emerald-400/85 shadow-[0_0_6px_rgba(52,211,153,0.35)] transition";
    if (!interactive) {
        return (
            <span className={baseCls} aria-hidden="true">
                <Info size={14} />
            </span>
        );
    }
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className={`${baseCls} hover:bg-emerald-400/10 hover:text-emerald-300 hover:shadow-[0_0_10px_rgba(52,211,153,0.55)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400/60`}
        >
            <Info size={14} />
        </button>
    );
}

type InfoDialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
};

export function InfoDialog({ open, onClose, title, subtitle, children }: InfoDialogProps) {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCloseRef.current();
        };
        document.addEventListener("keydown", onKey);
        const html = document.documentElement;
        const prevHtml = html.style.overflow;
        const prevBody = document.body.style.overflow;
        html.style.overflow = "hidden";
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            html.style.overflow = prevHtml;
            document.body.style.overflow = prevBody;
        };
    }, [open]);

    if (!open) return null;
    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            data-app-modal-portal=""
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute inset-0 z-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
            />

            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0E1117] shadow-2xl">
                <header className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
                    <div className="min-w-0">
                        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
                            {title}
                        </div>
                        {subtitle && (
                            <div className="mt-0.5 text-sm font-semibold text-white">
                                {subtitle}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Закрыть"
                        className="-m-1 rounded-md p-1 text-white/50 transition hover:bg-white/5 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </header>

                <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-sm leading-6 text-white/75">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
