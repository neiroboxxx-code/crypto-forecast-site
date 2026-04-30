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
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        {
            id: crypto.randomUUID(),
            role: "assistant",
            createdAt: nowIso(),
            content: "Привет.",
        },
    ]);
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
        <section className="mr-auto w-full max-w-[720px] rounded-2xl border border-fuchsia-400/18 bg-[linear-gradient(165deg,rgba(14,17,23,0.92),rgba(10,12,18,0.88))] p-3 shadow-[0_0_0_1px_rgba(232,121,249,0.05),0_18px_48px_rgba(0,0,0,0.35)] md:w-1/2 md:max-w-none md:p-4">
            <header className="mb-3 flex items-center justify-between gap-3 border-b border-white/8 pb-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/90">
                    <Bot className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    Ассистент
                </div>
                {error ? (
                    <div className="rounded-lg border border-rose-400/25 bg-rose-400/10 px-2 py-1 text-[11px] text-rose-50">
                        Ошибка API
                    </div>
                ) : null}
            </header>

            <div className="min-h-[320px] rounded-xl border border-white/10 bg-black/28">
                <div
                    ref={listRef}
                    className="max-h-[380px] overflow-y-auto p-3"
                    aria-label="История сообщений ассистента"
                >
                    <div className="flex flex-col gap-2">
                        {messages.map((m) => {
                            const isUser = m.role === "user";
                            return (
                                <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                    <div
                                        className={`max-w-[88%] rounded-2xl border px-3 py-2 text-[12px] leading-relaxed ${
                                            isUser
                                                ? "border-cyan-400/25 bg-cyan-400/[0.06] text-white/90"
                                                : m.status === "pending"
                                                  ? "border-white/10 bg-white/[0.03] text-white/65"
                                                  : "border-white/10 bg-white/[0.03] text-white/80"
                                        }`}
                                    >
                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <form
                    className="flex items-end gap-2 border-t border-white/10 p-2.5"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void send(input);
                    }}
                >
                    <div className="flex-1">
                        <textarea
                            aria-label="Сообщение ассистенту"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            rows={2}
                            placeholder={
                                sessionId
                                    ? chatMode === "platform"
                                        ? "Спроси про платформу: «где находится…», «что значит метрика…»"
                                        : "Свободный чат: «объясни…», «сгенерируй гипотезы…», «найди источники…»"
                                    : "Инициализация…"
                            }
                            className="min-h-[44px] w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[12px] text-white/85 outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:ring-1 focus:ring-fuchsia-400/15"
                            disabled={!sessionId}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor="assistant-model">
                            Режим
                        </label>
                        <select
                            id="assistant-model"
                            value={chatMode}
                            onChange={(e) => setChatMode(e.target.value as AssistantChatMode)}
                            className="h-[38px] cursor-pointer rounded-xl border border-white/10 bg-black/25 px-2 text-[11px] font-semibold text-white/75 outline-none transition hover:border-white/15 hover:bg-black/30 focus:border-cyan-400/30 focus:ring-2 focus:ring-cyan-400/15"
                            disabled={!sessionId || isSending}
                        >
                            <option value="platform">GPTplatform</option>
                            <option value="pro">Pro</option>
                        </select>

                        <button
                            type="submit"
                            disabled={isSending || !sessionId || !input.trim()}
                            className="inline-flex h-[38px] w-[42px] items-center justify-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/12 text-fuchsia-50 shadow-[0_0_0_1px_rgba(232,121,249,0.12)] transition hover:bg-fuchsia-400/18 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/35"
                            aria-label="Отправить"
                        >
                            <Send className="h-3.5 w-3.5" aria-hidden />
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}

