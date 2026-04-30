"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";

type AssistantChatMode = "platform" | "pro";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
    status?: "pending" | "final";
};

function TypingDots() {
    // Три неоновые точки, по очереди «загораются»
    return (
        <span className="inline-flex items-center gap-2 px-1 py-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70 shadow-[0_0_14px_rgba(52,211,153,0.55)] animate-[assistantDot_900ms_ease-in-out_infinite]" />
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70 shadow-[0_0_14px_rgba(251,113,133,0.55)] animate-[assistantDot_900ms_ease-in-out_infinite_150ms]" />
            <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-400/70 shadow-[0_0_14px_rgba(232,121,249,0.6)] animate-[assistantDot_900ms_ease-in-out_infinite_300ms]" />
        </span>
    );
}

function nowIso(): string {
    return new Date().toISOString();
}

function apiBase(): string {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function AssistantChat() {
    const [chatMode, setChatMode] = useState<AssistantChatMode>("platform");
    const [messages, setMessages] = useState<ChatMessage[]>(() => []);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const k = "assistant:v1:session_id";
        const existing = window.localStorage.getItem(k);
        if (existing) {
            setSessionId(existing);
            return;
        }
        const next = crypto.randomUUID();
        window.localStorage.setItem(k, next);
        setSessionId(next);
    }, []);

    const listRef = useRef<HTMLDivElement>(null);

    const scrollToBottomSoon = () => {
        requestAnimationFrame(() => {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
    };

    const send = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isSending || !sessionId) return;

        setError(null);
        setIsSending(true);

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", createdAt: nowIso(), content: trimmed };
        const pendingId = crypto.randomUUID();
        const pendingMsg: ChatMessage = {
            id: pendingId,
            role: "assistant",
            createdAt: nowIso(),
            content: "",
            status: "pending",
        };
        setMessages((prev) => [...prev, userMsg, pendingMsg]);
        setInput("");
        scrollToBottomSoon();

        try {
            const res = await fetch(`${apiBase()}/api/assistant/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    session_id: sessionId,
                    scenario: "free_chat",
                    chat_mode: chatMode,
                    message: trimmed,
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
            const reply =
                (typeof topReply === "string" ? topReply : undefined)
                ?? (typeof dataReply === "string" ? dataReply : undefined)
                ?? "Ответ не распознан (проверь контракт /api/assistant/chat).";

            setMessages((prev) =>
                prev.map((m) => (m.id === pendingId ? { ...m, content: reply, status: "final" } : m)),
            );
            scrollToBottomSoon();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
            setError(msg);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === pendingId
                        ? {
                              ...m,
                              content: "Сейчас ассистент недоступен (ошибка вызова API). Детали: " + msg,
                              status: "final",
                          }
                        : m,
                ),
            );
            scrollToBottomSoon();
        } finally {
            setIsSending(false);
        }
    };

    return (
        <section className="mr-auto w-full max-w-[720px] md:w-1/2 md:max-w-none">
            {/* Диалог рисуется «на подложке страницы» — без контейнеров и рамок. */}
            <div ref={listRef} className="min-h-[520px] pb-28" aria-label="История сообщений ассистента">
                <div className="flex items-center gap-2 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/75">
                    <Bot className="h-4 w-4 shrink-0 opacity-75" aria-hidden />
                    Ассистент
                    {error ? <span className="ml-2 normal-case tracking-normal text-rose-200/75">Ошибка API</span> : null}
                </div>

                <div className="flex flex-col gap-2 py-2">
                    {messages.map((m) => {
                        const isUser = m.role === "user";
                        return (
                            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[92%] whitespace-pre-wrap px-1 py-1 text-[13px] leading-relaxed ${
                                        isUser ? "text-white/90" : m.status === "pending" ? "text-white/55" : "text-white/80"
                                    }`}
                                >
                                    {m.status === "pending" ? <TypingDots /> : m.content}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Поле ввода — отдельный элемент (как в референсе). */}
            <form
                className="fixed bottom-6 left-4 right-4 z-20 md:left-10 md:right-auto md:w-[min(680px,calc(50vw-56px))]"
                onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                }}
            >
                <div className="rounded-3xl bg-[#1d1f22] px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.35)]">
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <textarea
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
                                placeholder={sessionId ? "Напиши сообщение…" : "Инициализация…"}
                                className="max-h-[160px] min-h-[28px] w-full resize-none bg-transparent px-0 py-1 text-[14px] text-white/85 outline-none placeholder:text-white/35"
                                disabled={!sessionId}
                            />
                        </div>

                        <div className="flex items-center gap-1.5">
                            <label className="sr-only" htmlFor="assistant-model">
                                Режим
                            </label>
                            <select
                                id="assistant-model"
                                value={chatMode}
                                onChange={(e) => setChatMode(e.target.value as AssistantChatMode)}
                                className="h-[34px] cursor-pointer rounded-xl bg-transparent px-2 text-[12px] font-semibold text-white/65 outline-none transition hover:bg-white/[0.06] hover:text-white/90 focus:bg-white/[0.06] focus:text-white/90"
                                disabled={!sessionId || isSending}
                            >
                                <option value="platform">GPTplatform</option>
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

            {/* Локальная анимация, чтобы не трогать глобальный CSS */}
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

