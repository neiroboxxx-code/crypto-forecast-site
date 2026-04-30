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
            content: "Печатает…",
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
            <div className="flex h-[calc(100vh-220px)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-fuchsia-400/18 bg-[linear-gradient(165deg,rgba(14,17,23,0.92),rgba(10,12,18,0.88))] shadow-[0_0_0_1px_rgba(232,121,249,0.05),0_18px_48px_rgba(0,0,0,0.35)]">
                <div className="flex items-center justify-between px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/85">
                    <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 shrink-0 opacity-85" aria-hidden />
                        Ассистент
                    </div>
                    {error ? <span className="text-rose-200/80 normal-case tracking-normal">Ошибка API</span> : null}
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto px-4 pb-28" aria-label="История сообщений ассистента">
                    <div className="flex flex-col gap-2 py-2">
                        {messages.length === 0 ? (
                            <div className="text-[12px] text-white/25"> </div>
                        ) : (
                            messages.map((m) => {
                                const isUser = m.role === "user";
                                return (
                                    <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[12px] leading-relaxed ${
                                                isUser
                                                    ? "bg-white/[0.06] text-white/90"
                                                    : m.status === "pending"
                                                      ? "bg-black/20 text-white/55"
                                                      : "bg-black/20 text-white/80"
                                            }`}
                                        >
                                            {m.content}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <form
                    className="pointer-events-none absolute left-0 right-0"
                    aria-hidden
                />

                <form
                    className="sticky bottom-0 z-10 border-t border-white/5 bg-black/25 px-4 py-3 backdrop-blur"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input);
                    }}
                >
                    <div className="flex items-end gap-3">
                        <div className="flex-1">
                            <textarea
                                aria-label="Сообщение ассистенту"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                rows={2}
                                placeholder={sessionId ? "Напиши сообщение…" : "Инициализация…"}
                                className="min-h-[42px] w-full resize-none rounded-xl bg-black/0 px-0 py-1 text-[13px] text-white/85 outline-none placeholder:text-white/25"
                                disabled={!sessionId}
                            />
                        </div>

                        <div className="pointer-events-auto flex items-center gap-2">
                            <label className="sr-only" htmlFor="assistant-model">
                                Режим
                            </label>
                            <select
                                id="assistant-model"
                                value={chatMode}
                                onChange={(e) => setChatMode(e.target.value as AssistantChatMode)}
                                className="h-[34px] cursor-pointer rounded-lg bg-transparent px-2 text-[12px] font-semibold text-white/65 outline-none transition hover:bg-white/[0.06] hover:text-white/85 focus:bg-white/[0.06] focus:text-white/90"
                                disabled={!sessionId || isSending}
                            >
                                <option value="platform">GPTplatform</option>
                                <option value="pro">Pro</option>
                            </select>

                            <button
                                type="submit"
                                disabled={isSending || !sessionId || !input.trim()}
                                className="inline-flex h-[34px] w-[38px] items-center justify-center rounded-lg bg-transparent text-white/70 outline-none transition hover:bg-white/[0.06] hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:bg-white/[0.06] focus-visible:text-white/90"
                                aria-label="Отправить"
                            >
                                <Send className="h-4 w-4" aria-hidden />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </section>
    );
}

