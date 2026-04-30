"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil } from "lucide-react";

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
        <div
            className="ml-auto flex max-w-[min(100%,16rem)] shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-[#0E1117]/90 px-2 py-1.5 shadow-sm sm:max-w-none"
            aria-label="Профиль в этом браузере"
        >
            <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-cyan-400/20 bg-cyan-400/10 text-[10px] font-bold leading-none text-cyan-100"
                aria-hidden
            >
                {initials}
            </div>
            <div className="min-w-0 flex-1">
                {!editing ? (
                    <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium text-white/95">{displayName}</span>
                        <button
                            type="button"
                            onClick={() => {
                                setDraft(displayName);
                                setEditing(true);
                            }}
                            className="shrink-0 rounded-md border border-white/10 p-1 text-white/50 transition hover:border-white/18 hover:bg-white/[0.05] hover:text-white/75"
                            title="Изменить имя"
                            aria-label="Изменить имя"
                        >
                            <Pencil className="h-3 w-3" aria-hidden />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={64}
                            placeholder="Имя"
                            className="min-w-0 flex-1 rounded-md border border-white/12 bg-black/40 px-1.5 py-1 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-cyan-400/35"
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
                            className="shrink-0 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-1 text-emerald-200/95"
                            title="Сохранить"
                            aria-label="Сохранить имя"
                        >
                            <Check className="h-3 w-3" aria-hidden />
                        </button>
                    </div>
                )}
                <div className="mt-0.5 truncate text-[9px] tabular-nums tracking-wide text-white/32">· {sessionTag}</div>
            </div>
        </div>
    );
}
