import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useApi } from "@/hooks/use-api";

describe("useApi", () => {
    it("refresh triggers fetcher again", async () => {
        const fetcher = vi.fn(async () => ({ ok: true }));
        const { result } = renderHook(() => useApi(fetcher, [], { intervalMs: 0 }));

        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
        act(() => {
            result.current.refresh();
        });
        await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    });
});

