"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

export function CabinetUserCard() {
    const [nickname, setNickname] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/auth/me", { cache: "no-store" })
            .then((r) => r.ok ? r.json() : null)
            .then((d) => { if (d?.nickname) setNickname(d.nickname); })
            .catch(() => {});
    }, []);

    const logout = async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        window.location.href = "/login";
    };

    const initials = nickname
        ? nickname.slice(0, 2).toUpperCase()
        : "—";

    return (
        <div className="inline-flex items-center gap-2" aria-label="Профиль">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-cyan-100/95">
                {initials}
            </div>
            {nickname && (
                <span className="text-[13px] font-medium text-white/70">
                    {nickname}
                </span>
            )}
            <button
                type="button"
                onClick={logout}
                disabled={loading}
                className="rounded p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
                title="Выйти"
                aria-label="Выйти"
            >
                <LogOut className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
