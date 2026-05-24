/**
 * Reading progress — client-side API.
 *
 * Session ID: UUID stored in localStorage (transparent to user, survives page reload).
 * Synced to VPS SQLite via /api/library/progress endpoints.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Session ID ────────────────────────────────────────────────────────────────

const SESSION_KEY = "library_session_id";

function generateUUID(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

export function getSessionId(): string {
    if (typeof window === "undefined") return "ssr";
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
        id = generateUUID();
        localStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookProgress {
    book_id: string;
    page: number;
    total_pages: number | null;
    percent: number;
    cfi: string | null;
    last_opened_at: string;
}

export interface SaveProgressPayload {
    book_id: string;
    page: number;
    total_pages?: number | null;
    percent: number;
    cfi?: string | null;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchAllProgress(): Promise<BookProgress[]> {
    const sessionId = getSessionId();
    const res = await fetch(
        `${API_URL}/api/library/progress?session_id=${encodeURIComponent(sessionId)}`,
        { cache: "no-store" },
    );
    if (!res.ok) return [];
    return res.json();
}

export async function saveProgress(payload: SaveProgressPayload): Promise<void> {
    const sessionId = getSessionId();
    try {
        await fetch(`${API_URL}/api/library/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, session_id: sessionId }),
        });
    } catch {
        // Progress save errors are non-fatal — silently ignore
    }
}

export function bookFileUrl(bookId: string): string {
    return `${API_URL}/api/library/file/${bookId}`;
}
