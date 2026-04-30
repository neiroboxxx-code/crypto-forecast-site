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
        <div className="inline-flex max-w-[min(100%,18rem)] flex-row-reverse items-center gap-2 sm:max-w-none" aria-label="Профиль в этом браузере">
            <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold leading-none text-cyan-100/95"
                aria-hidden
            >
                {initials}
            </div>
            <div className="min-w-0 text-right">
                {!editing ? (
                    <div className="flex items-center justify-end gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                setDraft(displayName);
                                setEditing(true);
                            }}
                            className="shrink-0 rounded p-1 text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
                            title="Изменить имя"
                            aria-label="Изменить имя"
                        >
                            <Pencil className="h-3 w-3" aria-hidden />
                        </button>
                        <span className="truncate text-[13px] font-medium text-white/90">{displayName}</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-end gap-1">
                        <button
                            type="button"
                            onClick={commitName}
                            className="shrink-0 rounded p-1 text-emerald-400/90 transition hover:bg-emerald-400/10"
                            title="Сохранить"
                            aria-label="Сохранить имя"
                        >
                            <Check className="h-3 w-3" aria-hidden />
                        </button>
                        <input
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={64}
                            placeholder="Имя"
                            className="w-[7.5rem] rounded border border-white/12 bg-black/30 px-1.5 py-0.5 text-right text-[12px] text-white outline-none placeholder:text-white/35 focus:border-cyan-400/35 sm:w-40"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitName();
                                if (e.key === "Escape") {
                                    setDraft(displayName);
                                    setEditing(false);
                                }
                            }}
                        />
                    </div>
                )}
                <div className="mt-0.5 truncate text-[9px] tabular-nums text-white/28">{sessionTag}</div>
            </div>
        </div>
    );
}
