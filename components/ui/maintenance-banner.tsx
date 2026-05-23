"use client";

import { useEffect, useState } from "react";
import { getHealth } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

/**
 * GlobalMaintenanceBanner
 *
 * Polls /health every 20 seconds.
 * Shows a sticky warning banner when the API is unreachable.
 * Automatically hides when the API comes back.
 * Does NOT show on the very first render — waits for the first health check
 * result so there's no flash on normal loads.
 */
export function MaintenanceBanner() {
    // null = unknown (first check pending), true = ok, false = down
    const [apiDown, setApiDown] = useState<boolean | null>(null);

    useEffect(() => {
        let alive = true;

        async function check() {
            const h = await getHealth();
            if (!alive) return;
            setApiDown(!h.ok);
        }

        check();
        const id = setInterval(check, 20_000);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, []);

    // Don't render anything until we know the status
    if (apiDown !== true) return null;

    return (
        <div
            role="alert"
            aria-live="assertive"
            className="
                sticky top-0 z-50 w-full
                border-b border-amber-500/30
                bg-amber-500/10 backdrop-blur-sm
                px-4 py-2.5
                flex items-center justify-center gap-2.5
                text-amber-300 text-sm
            "
        >
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
                Ведутся технические работы — часть функций может не работать.
                Приносим свои извинения за доставленные неудобства.
            </span>
        </div>
    );
}
