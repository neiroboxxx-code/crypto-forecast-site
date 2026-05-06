import { describe, expect, it, vi } from "vitest";

import { ApiError, getPaperbotState } from "@/lib/api";

describe("api runtime guards", () => {
    it("throws ApiError when PaperBotState shape is invalid", async () => {
        const fetchMock = vi.fn(async () => {
            return new Response(JSON.stringify({ nope: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        });
        vi.stubGlobal("fetch", fetchMock);

        await expect(getPaperbotState()).rejects.toBeInstanceOf(ApiError);
    });
});

