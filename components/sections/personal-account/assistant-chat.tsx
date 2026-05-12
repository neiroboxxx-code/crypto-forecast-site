"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bot, MessageSquarePlus, Send } from "lucide-react";

type AssistantChatMode = "platform" | "pro";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    status?: "pending" | "final";
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

const V1_SESSION = "assistant:v1:session_id";
const V2_BUNDLE = "assistant:v2:bundle";

const STALE_PENDING_REPLY =
    "Предыдущий ответ не был получен (запрос прервался или вкладка обновилась до ответа сервера). Напиши сообщение ещё раз.";

/** После перезагрузки страницы в localStorage остаётся assistant со status pending — без нового fetch UI «думает» вечно. */
function finalizeStalePendingMessages(threads: ChatThread[]): ChatThread[] {
    return threads.map((t) => ({
        ...t,
        messages: t.messages.map((m) =>
            m.role === "assistant" && m.status === "pending"
                ? { ...m, status: "final" as const, content: m.content.trim() || STALE_PENDING_REPLY }
                : m,
        ),
    }));
}

function nowIso(): string {
    return new Date().toISOString();
}

function apiBase(): string {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

/** Без этого fetch может ждать ответ бесконечно (обрыв сети, зависший upstream). */
const FETCH_TIMEOUT_MS_PLATFORM = 35_000;
const FETCH_TIMEOUT_MS_PRO = 95_000;

function stripCitationLines(text: string): string {
    return text
        .split("\n")
        .filter((line) => {
            const s = line.trim().toLowerCase();
            if (s.includes("источник") && (s.includes(".md") || s.includes("platform/") || s.includes("docs/"))) {
                return false;
            }
            if (/^\*+\([^)]*источник/.test(s)) return false;
            if (/^\(?источник\s*:/.test(s)) return false;
            return true;
        })
        .join("\n");
}

/** Убираем markdown и служебные строки — ответ читается как обычный текст. */
function stripAssistantDisplayText(text: string): string {
    let t = stripCitationLines(text).trim();
    t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
    t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
    t = t.replace(/^#{1,6}\s+/gm, "");
    t = t.replace(/^\s*[-–—]{3,}\s*$/gm, "");
    t = t.replace(/^Версия:\s*.+$/gim, "");
    while (t.includes("\n\n\n")) {
        t = t.replace("\n\n\n", "\n\n");
    }
    return t.trim();
}

function threadTitleFromMessages(msgs: ChatMessage[]): string {
    const u = msgs.find((m) => m.role === "user" && m.content.trim());
    if (!u) return "Новый чат";
    const s = u.content.trim().replace(/\s+/g, " ");
    return s.length > 44 ? `${s.slice(0, 44)}…` : s;
}

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-2 px-1 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70 shadow-[0_0_14px_rgba(52,211,153,0.55)] animate-[assistantDot_900ms_ease-in-out_infinite]" />
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70 shadow-[0_0_14px_rgba(251,113,133,0.55)] animate-[assistantDot_900ms_ease-in-out_infinite_150ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-400/70 shadow-[0_0_14px_rgba(232,121,249,0.6)] animate-[assistantDot_900ms_ease-in-out_infinite_300ms]" />
        </span>
    );
}

export function AssistantChat() {
    const [ready, setReady] = useState(false);
    const [chatMode, setChatMode] = useState<AssistantChatMode>("platform");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const listRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const raw = window.localStorage.getItem(V2_BUNDLE);
            if (raw) {
                const b = JSON.parse(raw) as Partial<StoredBundle>;
                if (b.v === 2 && b.sessionId && Array.isArray(b.threads) && b.activeThreadId) {
                    setSessionId(b.sessionId);
                    setThreads(finalizeStalePendingMessages(b.threads));
                    setActiveThreadId(b.activeThreadId);
                    setReady(true);
                    return;
                }
            }
        } catch {
            /* ignore */
        }
        let sid = window.localStorage.getItem(V1_SESSION);
        if (!sid) sid = crypto.randomUUID();
        window.localStorage.setItem(V1_SESSION, sid);
        const tid = crypto.randomUUID();
        setSessionId(sid);
        setThreads([{ id: tid, title: "Новый чат", messages: [], updatedAt: nowIso() }]);
        setActiveThreadId(tid);
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready || !sessionId || !activeThreadId) return;
        const bundle: StoredBundle = { v: 2, sessionId, threads, activeThreadId };
        try {
            window.localStorage.setItem(V2_BUNDLE, JSON.stringify(bundle));
            window.localStorage.setItem(V1_SESSION, sessionId);
        } catch {
            /* ignore */
        }
    }, [ready, sessionId, threads, activeThreadId]);

    const scrollToBottomSoon = () => {
        requestAnimationFrame(() => {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
    };

    useLayoutEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        const max = 200;
        el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    }, [input, ready]);

    const activeMessages = threads.find((t) => t.id === activeThreadId)?.messages ?? [];

    const startNewChat = () => {
        const nid = crypto.randomUUID();
        setThreads((prev) => {
            const cur = activeThreadId ? prev.find((t) => t.id === activeThreadId) : null;
            let base = prev;
            if (cur && cur.messages.length === 0) {
                base = prev.filter((t) => t.id !== activeThreadId);
            }
            return [...base, { id: nid, title: "Новый чат", messages: [], updatedAt: nowIso() }];
        });
        setActiveThreadId(nid);
        setInput("");
        setError(null);
    };

    const send = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isSending || !sessionId || !activeThreadId) return;

            setError(null);
            setIsSending(true);

            const tid = activeThreadId;
            const thread = threads.find((t) => t.id === tid);
            if (!thread) {
                setIsSending(false);
                return;
            }

            const historyPayload = thread.messages
                .filter((m) => m.status !== "pending" && m.content.trim())
                .map((m) => ({ role: m.role, content: m.content.trim() }));

            const userMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: "user",
                createdAt: nowIso(),
                content: trimmed,
            };
            const pendingId = crypto.randomUUID();
            const pendingMsg: ChatMessage = {
                id: pendingId,
                role: "assistant",
                createdAt: nowIso(),
                content: "",
                status: "pending",
            };

            setThreads((prev) =>
                prev.map((t) => {
                    if (t.id !== tid) return t;
                    const nextMsgs = [...t.messages, userMsg, pendingMsg];
                    return {
                        ...t,
                        messages: nextMsgs,
                        title: threadTitleFromMessages(nextMsgs),
                        updatedAt: nowIso(),
                    };
                }),
            );
            setInput("");
            scrollToBottomSoon();

            try {
                const timeoutMs = chatMode === "platform" ? FETCH_TIMEOUT_MS_PLATFORM : FETCH_TIMEOUT_MS_PRO;
                const ctrl = new AbortController();
                const abortTimer = window.setTimeout(() => ctrl.abort(), timeoutMs);
                try {
                    const res = await fetch(`${apiBase()}/api/assistant/chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        cache: "no-store",
                        signal: ctrl.signal,
                        body: JSON.stringify({
                            session_id: sessionId,
                            scenario: "free_chat",
                            chat_mode: chatMode,
                            message: trimmed,
                            history: historyPayload,
                        }),
                    });

                    if (!res.ok) {
                        const detail = await res.text().catch(() => "");
                        throw new Error(`HTTP ${res.status}${detail ? ` · ${detail}` : ""}`);
                    }

                    const payload = (await res.json()) as unknown;
                    const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
                    const topReply = obj?.reply;
                    const dataReply =
                        obj?.data && typeof obj.data === "object"
                            ? (obj.data as Record<string, unknown>).reply
                            : undefined;
                    const rawReply =
                        (typeof topReply === "string" ? topReply : undefined)
                        ?? (typeof dataReply === "string" ? dataReply : undefined)
                        ?? "Ответ не распознан (проверь контракт /api/assistant/chat).";
                    const reply =
                        chatMode === "platform" ? stripAssistantDisplayText(rawReply) : rawReply.trim();

                    setThreads((prev) =>
                        prev.map((t) => {
                            if (t.id !== tid) return t;
                            const nextMsgs = t.messages.map((m) =>
                                m.id === pendingId ? { ...m, content: reply, status: "final" as const } : m,
                            );
                            return { ...t, messages: nextMsgs, updatedAt: nowIso() };
                        }),
                    );
                    scrollToBottomSoon();
                } finally {
                    window.clearTimeout(abortTimer);
                }
            } catch (e) {
                const aborted = e instanceof Error && e.name === "AbortError";
                const msg = aborted
                    ? `Превышено время ожидания (${chatMode === "platform" ? Math.round(FETCH_TIMEOUT_MS_PLATFORM / 1000) : Math.round(FETCH_TIMEOUT_MS_PRO / 1000)} с). Проверь сеть или адрес API.`
                    : e instanceof Error
                      ? e.message
                      : "Неизвестная ошибка";
                setError(msg);
                setThreads((prev) =>
                    prev.map((t) => {
                        if (t.id !== tid) return t;
                        return {
                            ...t,
                            messages: t.messages.map((m) =>
                                m.id === pendingId
                                    ? {
                                          ...m,
                                          content: "Сейчас ассистент недоступен (ошибка вызова API). Детали: " + msg,
                                          status: "final" as const,
                                      }
                                    : m,
                            ),
                            updatedAt: nowIso(),
                        };
                    }),
                );
                scrollToBottomSoon();
            } finally {
                setIsSending(false);
            }
        },
        [isSending, sessionId, activeThreadId, threads, chatMode],
    );

    if (!ready || !sessionId || !activeThreadId) {
        return (
            <div className="py-10 text-center text-[13px] text-white/45" aria-live="polite">
                Загрузка чата…
            </div>
        );
    }

    return (
        <section
            className="mr-auto flex w-full max-w-none flex-col gap-3 md:flex-row md:items-stretch md:gap-4"
            aria-label="Ассистент платформы"
        >
            <div className="flex min-h-[min(70vh,760px)] min-w-0 flex-1 flex-col">
                <div
                    ref={listRef}
                    className="min-h-0 flex-1 overflow-y-auto pb-2"
                    aria-label="История сообщений ассистента"
                >
                    <div className="flex items-center gap-2 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/75">
                        <Bot className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
                        Ассистент
                        {error ? (
                            <span className="ml-2 normal-case tracking-normal text-rose-200/75">Ошибка API</span>
                        ) : null}
                    </div>

                    <div className="flex flex-col gap-2 py-2">
                        {activeMessages.map((m) => {
                            const isUser = m.role === "user";
                            const display =
                                m.role === "assistant" && m.status === "final"
                                    ? chatMode === "platform"
                                        ? stripAssistantDisplayText(m.content)
                                        : m.content
                                    : m.content;
                            return (
                                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[92%] whitespace-pre-wrap px-1 py-1 text-[14px] leading-relaxed tracking-tight ${
                                            isUser
                                                ? "text-white/90"
                                                : m.status === "pending"
                                                  ? "text-white/55"
                                                  : "text-white/[0.82]"
                                        }`}
                                    >
                                        {m.status === "pending" ? <TypingDots /> : display}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <form
                    className="shrink-0 border-t border-white/[0.06] pt-3"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input);
                    }}
                >
                    <div className="rounded-3xl bg-[#1d1f22] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
                        <div className="flex items-end gap-3">
                            <div className="min-h-[28px] flex-1">
                                <textarea
                                    ref={textareaRef}
                                    aria-label="Сообщение ассистенту"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            void send(input);
                                        }
                                    }}
                                    rows={1}
                                    placeholder="Напиши сообщение…"
                                    className="max-h-[200px] min-h-[28px] w-full resize-none overflow-y-auto bg-transparent px-0 py-1 text-[14px] leading-snug text-white/85 outline-none placeholder:text-white/35"
                                    disabled={!sessionId}
                                />
                            </div>

                            <div className="flex items-center gap-1.5 pb-0.5">
                                <label className="sr-only" htmlFor="assistant-model">
                                    Режим
                                </label>
                                <select
                                    id="assistant-model"
                                    value={chatMode}
                                    onChange={(e) => setChatMode(e.target.value as AssistantChatMode)}
                                    className="h-[34px] max-w-[140px] cursor-pointer truncate rounded-xl bg-transparent px-2 text-[12px] font-semibold text-white/65 outline-none transition hover:bg-white/[0.06] hover:text-white/90 focus:bg-white/[0.06] focus:text-white/90"
                                    disabled={!sessionId || isSending}
                                >
                                    <option value="platform">GPT platform</option>
                                    <option value="pro">Pro</option>
                                </select>

                                <button
                                    type="submit"
                                    disabled={isSending || !sessionId || !input.trim()}
                                    className="inline-flex h-[34px] w-[38px] items-center justify-center rounded-xl bg-transparent text-white/70 outline-none transition hover:bg-white/[0.06] hover:text-white/95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:bg-white/[0.06] focus-visible:text-white/95"
                                    aria-label="Отправить"
                                >
                                    <Send className="h-4 w-4" aria-hidden />
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <aside
                className="flex shrink-0 flex-col gap-2 border-t border-white/10 pt-3 md:w-52 md:border-l md:border-t-0 md:pl-4 md:pt-0"
                aria-label="История диалогов"
            >
                <button
                    type="button"
                    onClick={startNewChat}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-2 text-[12px] font-semibold text-fuchsia-100/90 transition hover:bg-fuchsia-400/15"
                >
                    <MessageSquarePlus className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    Новый чат
                </button>
                <div className="flex max-h-40 flex-row gap-1.5 overflow-x-auto pb-1 md:max-h-none md:flex-col md:overflow-y-auto md:pr-1">
                    {[...threads]
                        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
                        .map((t) => {
                            const active = t.id === activeThreadId;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveThreadId(t.id);
                                        setError(null);
                                    }}
                                    className={`shrink-0 rounded-lg border px-2.5 py-2 text-left text-[12px] transition md:w-full ${
                                        active
                                            ? "border-fuchsia-400/40 bg-fuchsia-400/12 text-white/90"
                                            : "border-transparent bg-white/[0.04] text-white/55 hover:border-white/10 hover:bg-white/[0.07] hover:text-white/80"
                                    }`}
                                >
                                    <span className="line-clamp-2 break-words">{t.title || "Диалог"}</span>
                                </button>
                            );
                        })}
                </div>
            </aside>

            <style jsx global>{`
                @keyframes assistantDot {
                    0%,
                    100% {
                        opacity: 0.35;
                        transform: translateY(0);
                        filter: saturate(0.9);
                    }
                    50% {
                        opacity: 1;
                        transform: translateY(-1px);
                        filter: saturate(1.2);
                    }
                }
            `}</style>
        </section>
    );
}
