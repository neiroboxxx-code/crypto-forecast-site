"use client";

import { useEffect } from "react";

/**
 * Автообновление страницы через window.location.reload().
 * Рендерит null — только side-effect.
 *
 * @param intervalMs - интервал в миллисекундах (по умолчанию 30 минут)
 */
export function AutoRefresh({ intervalMs = 30 * 60 * 1000 }: { intervalMs?: number }) {
    useEffect(() => {
        const id = setInterval(() => {
            window.location.reload();
        }, intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);

    return null;
}
