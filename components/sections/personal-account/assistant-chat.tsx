"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Paperclip, Plus, Send, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

// ─── Types ───────────────────────────────────────────────────────────────────

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    status?: "pending" | "final";
    imagePreview?: string;
};

type ChatThread = {
    id: string;
    title: string;
    messages: ChatMessage[];
    updatedAt: string;
};

type StoredBundle = {
    v: 2;
    sessionId: string;
    threads: ChatThread[];
    activeThreadId: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const V1_SESSION     = "assistant:v1:session_id";
const V2_BUNDLE      = "assistant:v2:bundle";
const SIDEBAR_KEY    = "assistant:v1:sidebar_open";
const FETCH_TIMEOUT  = 90_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const HISTORY_WINDOW = 20;

const STALE_REPLY = "Предыдущий ответ не был получен. Напиши сообщение ещё раз.";

const SUGGESTIONS = [
    "Какой сейчас сигнал по BTCUSDT?",
    "Ключевые уровни поддержки и сопротивления",
    "Объясни структуру рынка сейчас",
    "Что такое BOS и CHoCH?",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nowIso() { return new Date().toISOString(); }

function apiBase() { return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"; }

function readLocal(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key: string, val: string) {
    try { localStorage.setItem(key, val); } catch { /* ignore */ }
}

function threadTitle(msgs: ChatMessage[]): string {
    const u = msgs.find((m) => m.role === "user" && m.content.trim());
    if (!u) return "Новый чат";
    const s = u.content.trim().replace(/\s+/g, " ");
    return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

function finalizeStalePending(threads: ChatThread[]): ChatThread[] {
    return threads.map((t) => ({
        ...t,
        messages: t.messages.map((m) =>
            m.role === "assistant" && m.status === "pending"
                ? { ...m, status: "final" as const, content: STALE_REPLY }
                : m,
        ),
    }));
}

function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1.5 py-1 pl-0.5">
            {[0, 160, 320].map((d) => (
                <span
                    key={d}
                    className="h-[7px] w-[7px] rounded-full bg-fuchsia-400/55"
                    style={{ animation: `assistantPulse 1.1s ease-in-out ${d}ms infinite` }}
                />
            ))}
        </span>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssistantChat() {
    // Persistence state
    const [ready, setReady]               = useState(false);
    const [sessionId, setSessionId]       = useState<string | null>(null);
    const [threads, setThreads]           = useState<ChatThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen]   = useState(true);

    // UI state
    const [input, setInput]               = useState("");
    const [isSending, setIsSending]       = useState(false);
    const [error, setError]               = useState<string | null>(null);
    const [hoveredId, setHoveredId]       = useState<string | null>(null);

    // Image state
    const [imageBase64, setImageBase64]         = useState<string | null>(null);
    const [imageMime, setImageMime]             = useState<string | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    const listRef     = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileRef     = useRef<HTMLInputElement>(null);

    // ── Load from localStorage ─────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined") return;

        const stored = readLocal(SIDEBAR_KEY);
        if (stored !== null) setSidebarOpen(stored !== "false");

        try {
            const raw = readLocal(V2_BUNDLE);
            if (raw) {
                const b = JSON.parse(raw) as Partial<StoredBundle>;
                if (b.v === 2 && b.sessionId && Array.isArray(b.threads) && b.activeThreadId) {
                    setSessionId(b.sessionId);
                    setThreads(finalizeStalePending(b.threads));
                    setActiveThreadId(b.activeThreadId);
                    setReady(true);
                    return;
                }
            }
        } catch { /* ignore */ }

        let sid = readLocal(V1_SESSION);
        if (!sid) { sid = crypto.randomUUID(); writeLocal(V1_SESSION, sid); }
        const tid = crypto.randomUUID();
        setSessionId(sid);
        setThreads([{ id: tid, title: "Новый чат", messages: [], updatedAt: nowIso() }]);
        setActiveThreadId(tid);
        setReady(true);
    }, []);

    // ── Persist bundle ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!ready || !sessionId || !activeThreadId) return;
        writeLocal(V2_BUNDLE, JSON.stringify({ v: 2, sessionId, threads, activeThreadId } satisfies StoredBundle));
        writeLocal(V1_SESSION, sessionId);
    }, [ready, sessionId, threads, activeThreadId]);

    useEffect(() => { writeLocal(SIDEBAR_KEY, String(sidebarOpen)); }, [sidebarOpen]);

    // ── Auto-resize textarea ───────────────────────────────────────────────
    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    }, [input, ready]);

    const scrollBottom = () => {
        requestAnimationFrame(() =>
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }),
        );
    };

    const activeMessages = threads.find((t) => t.id === activeThreadId)?.messages ?? [];

    // ── Image handling ─────────────────────────────────────────────────────
    const clearImage = useCallback(() => {
        setImageBase64(null);
        setImageMime(null);
        setImagePreviewUrl(null);
        if (fileRef.current) fileRef.current.value = "";
    }, []);

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) return;
        if (file.size > MAX_IMAGE_BYTES) { setError("Файл слишком большой (макс. 5 МБ)"); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setImageBase64(result);
            setImageMime(file.type);
            setImagePreviewUrl(result);
            setError(null);
        };
        reader.readAsDataURL(file);
    }, []);

    // ── Thread actions ─────────────────────────────────────────────────────
    const startNewChat = useCallback(() => {
        const nid = crypto.randomUUID();
        setThreads((prev) => {
            const cur = prev.find((t) => t.id === activeThreadId);
            const base = cur?.messages.length === 0 ? prev.filter((t) => t.id !== activeThreadId) : prev;
            return [...base, { id: nid, title: "Новый чат", messages: [], updatedAt: nowIso() }];
        });
        setActiveThreadId(nid);
        setInput("");
        setError(null);
        clearImage();
    }, [activeThreadId, clearImage]);

    const deleteThread = useCallback((tid: string) => {
        setThreads((prev) => {
            const next = prev.filter((t) => t.id !== tid);
            if (next.length === 0) {
                const nid = crypto.randomUUID();
                setActiveThreadId(nid);
                return [{ id: nid, title: "Новый чат", messages: [], updatedAt: nowIso() }];
            }
            if (activeThreadId === tid) {
                const pick = [...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]!;
                setActiveThreadId(pick.id);
            }
            return next;
        });
    }, [activeThreadId]);

    // ── Send ───────────────────────────────────────────────────────────────
    const send = useCallback(async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isSending || !sessionId || !activeThreadId) return;

        setError(null);
        setIsSending(true);

        const tid    = activeThreadId;
        const thread = threads.find((t) => t.id === tid);
        if (!thread) { setIsSending(false); return; }

        const historyPayload = thread.messages
            .filter((m) => m.status !== "pending" && m.content.trim())
            .slice(-HISTORY_WINDOW)
            .map((m) => ({ role: m.role, content: m.content.trim() }));

        const img64    = imageBase64;
        const imgMime  = imageMime;
        const imgPrev  = imagePreviewUrl;
        clearImage();

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(), role: "user",
            createdAt: nowIso(), content: trimmed,
            imagePreview: imgPrev ?? undefined,
        };
        const pendingId = crypto.randomUUID();
        const pendingMsg: ChatMessage = {
            id: pendingId, role: "assistant",
            createdAt: nowIso(), content: "", status: "pending",
        };

        setThreads((prev) => prev.map((t) => {
            if (t.id !== tid) return t;
            const next = [...t.messages, userMsg, pendingMsg];
            return { ...t, messages: next, title: threadTitle(next), updatedAt: nowIso() };
        }));
        setInput("");
        scrollBottom();

        try {
            const ctrl  = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
            try {
                const res = await fetch(`${apiBase()}/api/assistant/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    cache: "no-store",
                    signal: ctrl.signal,
                    body: JSON.stringify({
                        session_id:   sessionId,
                        scenario:     "free_chat",
                        chat_mode:    "platform",
                        message:      trimmed,
                        image_base64: img64   ?? undefined,
                        image_mime:   imgMime ?? undefined,
                        history:      historyPayload,
                    }),
                });

                if (!res.ok) {
                    const detail = await res.text().catch(() => "");
                    throw new Error(`HTTP ${res.status}${detail ? ` · ${detail}` : ""}`);
                }

                const payload = (await res.json()) as Record<string, unknown>;
                const raw =
                    (typeof payload?.reply === "string" ? payload.reply : undefined) ??
                    (typeof (payload?.data as Record<string, unknown>)?.reply === "string"
                        ? ((payload.data as Record<string, unknown>).reply as string)
                        : undefined) ??
                    "Ответ не распознан.";

                setThreads((prev) => prev.map((t) => {
                    if (t.id !== tid) return t;
                    return {
                        ...t,
                        updatedAt: nowIso(),
                        messages: t.messages.map((m) =>
                            m.id === pendingId ? { ...m, content: raw.trim(), status: "final" as const } : m,
                        ),
                    };
                }));
                scrollBottom();
            } finally {
                window.clearTimeout(timer);
            }
        } catch (e) {
            const aborted = e instanceof Error && e.name === "AbortError";
            const msg = aborted
                ? `Превышено время ожидания (${Math.round(FETCH_TIMEOUT / 1000)} с).`
                : e instanceof Error ? e.message : "Неизвестная ошибка";
            setError(msg);
            setThreads((prev) => prev.map((t) => {
                if (t.id !== tid) return t;
                return {
                    ...t,
                    messages: t.messages.map((m) =>
                        m.id === pendingId
                            ? { ...m, content: "Ассистент недоступен: " + msg, status: "final" as const }
                            : m,
                    ),
                };
            }));
            scrollBottom();
        } finally {
            setIsSending(false);
        }
    }, [isSending, sessionId, activeThreadId, threads, imageBase64, imageMime, imagePreviewUrl, clearImage]);

    // ── Render guard ───────────────────────────────────────────────────────
    if (!ready || !sessionId || !activeThreadId) {
        return <div className="py-12 text-center text-[13px] text-white/35">Загрузка…</div>;
    }

    const sortedThreads = [...threads].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    // ── Layout ─────────────────────────────────────────────────────────────
    return (
        <>
            <section
                className="flex w-full overflow-hidden rounded-xl border border-white/[0.06] bg-[#0c0e12]/60"
                style={{ height: "min(74vh, 780px)" }}
                aria-label="Ассистент платформы"
            >
                {/* ── Sidebar (left) ── */}
                <aside
                    className={`flex shrink-0 flex-col border-r border-white/[0.05] transition-[width] duration-200 ${
                        sidebarOpen ? "w-52" : "w-10"
                    }`}
                >
                    {sidebarOpen ? (
                        <>
                            {/* Sidebar header */}
                            <div className="flex items-center justify-between px-3 pt-3 pb-2">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                                    Недавние
                                </span>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={startNewChat}
                                        title="Новый чат"
                                        className="rounded-md p-1 text-white/40 transition hover:bg-white/[0.07] hover:text-fuchsia-300"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSidebarOpen(false)}
                                        title="Свернуть"
                                        className="rounded-md p-1 text-white/25 transition hover:bg-white/[0.07] hover:text-white/60"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Thread list */}
                            <div className="flex-1 overflow-y-auto px-1.5 pb-3">
                                {sortedThreads.map((t) => {
                                    const active  = t.id === activeThreadId;
                                    const hovered = hoveredId === t.id;
                                    return (
                                        <div
                                            key={t.id}
                                            className="group relative"
                                            onMouseEnter={() => setHoveredId(t.id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => { setActiveThreadId(t.id); setError(null); }}
                                                className={`w-full rounded-lg px-2.5 py-[7px] text-left text-[12.5px] leading-snug transition ${
                                                    active
                                                        ? "text-fuchsia-200/95 font-medium"
                                                        : "text-white/45 hover:text-white/75"
                                                }`}
                                            >
                                                <span className="block truncate pr-5">
                                                    {t.title || "Диалог"}
                                                </span>
                                            </button>
                                            {hovered && (
                                                <button
                                                    type="button"
                                                    title="Удалить чат"
                                                    onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-white/25 transition hover:text-rose-300"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        /* Collapsed sidebar — only icons */
                        <div className="flex flex-col items-center gap-2 pt-3">
                            <button
                                type="button"
                                onClick={startNewChat}
                                title="Новый чат"
                                className="rounded-md p-1.5 text-white/40 transition hover:bg-white/[0.07] hover:text-fuchsia-300"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                title="Развернуть"
                                className="rounded-md p-1.5 text-white/25 transition hover:bg-white/[0.07] hover:text-white/65"
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </aside>

                {/* ── Chat area ── */}
                <div className="flex min-w-0 flex-1 flex-col">

                    {/* Header */}
                    <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-4 py-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-400/12">
                            <Bot className="h-3.5 w-3.5 text-fuchsia-300/80" />
                        </div>
                        <span className="text-[12px] font-semibold tracking-wide text-white/55">
                            Ассистент
                        </span>
                        {error && (
                            <span className="ml-1 text-[11px] text-rose-300/70">· ошибка</span>
                        )}
                    </div>

                    {/* Messages */}
                    <div
                        ref={listRef}
                        className="min-h-0 flex-1 overflow-y-auto px-4"
                        aria-label="История сообщений"
                    >
                        {activeMessages.length === 0 ? (
                            /* Empty state */
                            <div className="flex h-full flex-col items-center justify-center gap-5 pb-8">
                                <div className="flex flex-col items-center gap-1.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fuchsia-400/10">
                                        <Bot className="h-4.5 w-4.5 text-fuchsia-300/60" />
                                    </div>
                                    <p className="text-[13px] text-white/35">Чем могу помочь?</p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => {
                                                setInput(s);
                                                textareaRef.current?.focus();
                                            }}
                                            className="rounded-full border border-white/[0.09] px-3 py-1.5 text-[11.5px] text-white/40 transition hover:border-fuchsia-400/25 hover:text-white/70"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 py-4">
                                {activeMessages.map((m) => {
                                    const isUser = m.role === "user";
                                    return (
                                        <div
                                            key={m.id}
                                            className={`group flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
                                        >
                                            {/* Avatar dot (assistant only) */}
                                            {!isUser && (
                                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-fuchsia-400/12">
                                                    <Bot className="h-3 w-3 text-fuchsia-300/75" />
                                                </div>
                                            )}

                                            <div className={`max-w-[80%] ${isUser ? "flex flex-col items-end" : ""}`}>
                                                {/* Image preview in message */}
                                                {m.imagePreview && (
                                                    <img
                                                        src={m.imagePreview}
                                                        alt="прикреплённый скрин"
                                                        className="mb-1.5 max-h-52 max-w-[260px] rounded-xl object-contain"
                                                    />
                                                )}

                                                {/* Message bubble / text */}
                                                <div className={`relative text-[15px] leading-relaxed tracking-tight ${
                                                    isUser
                                                        ? "rounded-2xl rounded-tr-sm bg-white/[0.07] px-3.5 py-2.5 text-white/88 whitespace-pre-wrap"
                                                        : m.status === "pending"
                                                          ? "text-white/40"
                                                          : "text-white/82"
                                                }`}>
                                                    {m.status === "pending" ? <TypingDots /> : isUser ? m.content : (
                                                        <ReactMarkdown
                                                            components={{
                                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                                strong: ({ children }) => <strong className="font-semibold text-white/95">{children}</strong>,
                                                                em: ({ children }) => <em className="italic text-white/75">{children}</em>,
                                                                ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1.5">{children}</ol>,
                                                                ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1.5">{children}</ul>,
                                                                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                                                h1: ({ children }) => <h1 className="mb-2 mt-3 text-[16px] font-semibold text-white/90">{children}</h1>,
                                                                h2: ({ children }) => <h2 className="mb-1.5 mt-3 text-[15px] font-semibold text-white/85">{children}</h2>,
                                                                h3: ({ children }) => <h3 className="mb-1 mt-2 text-[14px] font-medium text-white/80">{children}</h3>,
                                                                code: ({ children }) => <code className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[13px] text-fuchsia-200/80">{children}</code>,
                                                                pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-xl bg-white/[0.05] p-3 text-[13px]">{children}</pre>,
                                                                blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-fuchsia-400/30 pl-3 text-white/55">{children}</blockquote>,
                                                                hr: () => <hr className="my-3 border-white/[0.08]" />,
                                                            }}
                                                        >
                                                            {m.content}
                                                        </ReactMarkdown>
                                                    )}
                                                </div>

                                                {/* Timestamp on hover */}
                                                <span className="mt-0.5 block text-right text-[10px] text-white/20 opacity-0 transition-opacity group-hover:opacity-100">
                                                    {fmtTime(m.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-rose-500/8 px-3 py-2 text-[11.5px] text-rose-300/80">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400/70" />
                            <span className="flex-1">{error}</span>
                            <button
                                type="button"
                                onClick={() => setError(null)}
                                className="shrink-0 text-white/30 hover:text-white/60"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}

                    {/* Image preview strip */}
                    {imagePreviewUrl && (
                        <div className="mx-4 mb-2">
                            <div className="relative inline-block">
                                <img
                                    src={imagePreviewUrl}
                                    alt="превью"
                                    className="h-14 w-14 rounded-lg border border-white/10 object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={clearImage}
                                    className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#111316] ring-1 ring-white/15 text-white/55 hover:text-white/90"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <form
                        onSubmit={(e) => { e.preventDefault(); void send(input); }}
                        className="shrink-0 px-4 pb-4"
                    >
                        <div className="rounded-2xl bg-white/[0.045] px-3 py-2.5 ring-1 ring-white/[0.07] transition-shadow focus-within:ring-fuchsia-400/20">
                            <div className="flex items-end gap-2">
                                {/* Attach button */}
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={isSending}
                                    title="Прикрепить скрин (или вставь Ctrl+V)"
                                    className={`shrink-0 rounded-lg p-1.5 transition ${
                                        imagePreviewUrl
                                            ? "text-fuchsia-300"
                                            : "text-white/30 hover:bg-white/[0.06] hover:text-white/60"
                                    } disabled:opacity-40`}
                                >
                                    <Paperclip className="h-4 w-4" />
                                </button>

                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                                />

                                {/* Textarea */}
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            void send(input);
                                        }
                                    }}
                                    onPaste={(e) => {
                                        // Вставка скрина прямо из буфера (Cmd+Ctrl+Shift+4 → Cmd+V)
                                        const item = Array.from(e.clipboardData.items).find(
                                            (i) => i.type.startsWith("image/"),
                                        );
                                        if (item) {
                                            e.preventDefault();
                                            const f = item.getAsFile();
                                            if (f) handleFile(f);
                                        }
                                    }}
                                    rows={1}
                                    placeholder="Напиши вопрос или вставь скрин…"
                                    disabled={!sessionId || isSending}
                                    aria-label="Сообщение ассистенту"
                                    className="flex-1 resize-none bg-transparent py-0.5 text-[13.5px] leading-relaxed text-white/85 outline-none placeholder:text-white/28 disabled:opacity-50"
                                    style={{ maxHeight: 180 }}
                                />

                                {/* Send */}
                                <button
                                    type="submit"
                                    disabled={isSending || (!input.trim() && !imageBase64)}
                                    className="shrink-0 rounded-lg p-1.5 text-white/35 transition hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-25"
                                    aria-label="Отправить"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <p className="mt-1.5 select-none text-right text-[10px] text-white/18">
                            Shift+Enter — новая строка · Ctrl+V — вставить скрин
                        </p>
                    </form>
                </div>
            </section>

            <style jsx global>{`
                @keyframes assistantPulse {
                    0%, 100% { opacity: 0.25; transform: scale(0.85) translateY(0); }
                    50%       { opacity: 1;    transform: scale(1)    translateY(-2px); }
                }
            `}</style>
        </>
    );
}
