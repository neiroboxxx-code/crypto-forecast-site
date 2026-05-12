"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ApiState<T> = {
    data: T | null;
    error: string | null;
    loading: boolean;
    refreshing: boolean;
    refresh: () => void;
};

type UseApiOptions = {
    /** Auto-refetch interval in ms. Silent background refresh — does not reset data to null. */
    intervalMs?: number;
};

export function useApi<T>(
    fetcher: () => Promise<T>,
    deps: unknown[] = [],
    options: UseApiOptions = {},
): ApiState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tick, setTick] = useState(0);
    const isInitial = useRef(true);
    /** Не кладём fetcher в deps fetch-эффекта: иначе inline-функция с родителя даёт бесконечный refetch. */
    const fetcherRef = useRef(fetcher);

    const depsKey = useMemo(() => {
        try {
            return JSON.stringify(deps);
        } catch {
            return String(deps.length);
        }
    }, [deps]);

    useEffect(() => {
        fetcherRef.current = fetcher;
    }, [fetcher]);
    useEffect(() => {
        let alive = true;
        const initial = isInitial.current;
        isInitial.current = false;

        if (initial) {
            queueMicrotask(() => setLoading(true));
        } else {
            queueMicrotask(() => setRefreshing(true));
        }
        queueMicrotask(() => setError(null));

        fetcherRef
            .current()
            .then((v) => {
                if (!alive) return;
                queueMicrotask(() => setData(v));
            })
            .catch((e: unknown) => {
                if (!alive) return;
                queueMicrotask(() => setError(e instanceof Error ? e.message : "Fetch failed"));
            })
            .finally(() => {
                if (!alive) return;
                queueMicrotask(() => {
                    setLoading(false);
                    setRefreshing(false);
                });
            });

        return () => { alive = false; };
    }, [tick, depsKey]);

    // Auto-refresh interval: increments tick on schedule
    useEffect(() => {
        if (!options.intervalMs || options.intervalMs <= 0) return;
        const id = setInterval(() => {
            isInitial.current = false;
            setTick((t) => t + 1);
        }, options.intervalMs);
        return () => clearInterval(id);
    }, [options.intervalMs]);

    return {
        data,
        error,
        loading,
        refreshing,
        refresh: () => {
            isInitial.current = false;
            setTick((t) => t + 1);
        },
    };
}
