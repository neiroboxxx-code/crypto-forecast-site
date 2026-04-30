"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Shield } from "lucide-react";

const STORAGE_DISPLAY = "cfd-cabinet-display-name";
const STORAGE_SESSION = "cfd-cabinet-session-id";

function readStorage(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string) {
    try {
        localStorage.setItem(key, value);
    } catch {
        /* ignore quota / privacy mode */
    }
}

function initialsFromDisplayName(name: string): string {
    const t = name.trim();
    if (!t) return "—";
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]!.slice(0, 1) + parts[1]!.slice(0, 1)).toUpperCase();
    return t.slice(0, 2).toUpperCase();
}

function ensureSessionId(): string {
    let id = readStorage(STORAGE_SESSION);
    if (!id) {
        id = crypto.randomUUID();
        writeStorage(STORAGE_SESSION, id);
    }
    return id;
}

export function CabinetUserCard() {
    const [displayName, setDisplayName] = useState("");
    const [sessionTag, setSessionTag] = useState("");
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");

    useEffect(() => {
        const sid = ensureSessionId();
        setSessionTag(sid.replace(/-/g, "").slice(0, 8).toUpperCase());
        const name = readStorage(STORAGE_DISPLAY)?.trim() || "Трейдер";
        setDisplayName(name);
        setDraft(name);
    }, []);

    const initials = useMemo(() => initialsFromDisplayName(displayName), [displayName]);

    const commitName = () => {
        const next = draft.trim() || "Трейдер";
        setDisplayName(next);
        writeStorage(STORAGE_DISPLAY, next);
        setEditing(false);
    };

    return (
        <div className="flex w-full shrink-0 flex-col gap-3 rounded-xl border border-cyan-400/18 bg-black/35 p-4 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.06)] sm:max-w-sm md:w-auto md:max-w-none">
            <div className="flex items-start gap-3">
                <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-cyan-400/25 to-transparent text-[13px] font-bold tracking-tight text-cyan-50"
                    aria-hidden
                >
                    {initials}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/85">
                        <Shield className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                        Ваш кабинет
                    </div>
                    {!editing ? (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-semibold text-white">{displayName}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setDraft(displayName);
                                    setEditing(true);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65 transition hover:border-white/20 hover:bg-white/[0.07]"
                            >
                                <Pencil className="h-3 w-3" aria-hidden />
                                Имя
                            </button>
                        </div>
                    ) : (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                maxLength={64}
                                placeholder="Как к вам обращаться"
                                className="min-w-[10rem] flex-1 rounded-lg border border-white/12 bg-black/40 px-2.5 py-1.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/35"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") commitName();
                                    if (e.key === "Escape") {
                                        setDraft(displayName);
                                        setEditing(false);
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={commitName}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/35 bg-emerald-400/12 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-50"
                                title="Сохранить имя локально на этом устройстве"
                            >
                                <Check className="h-3 w-3" aria-hidden />
                                Ок
                            </button>
                        </div>
                    )}
                    <p className="mt-2 text-[11px] leading-relaxed text-white/45">
                        Вы внутри закрытой зоны кабинета. Позже здесь будет вход по аккаунту; сейчас имя и черновики хранятся только в этом
                        браузере.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] tabular-nums text-white/35">
                        <span className="rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 text-white/48">Локально</span>
                        <span>SID&nbsp;·&nbsp;{sessionTag}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
