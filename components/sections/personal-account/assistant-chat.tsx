"use client";

import { useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";

type AssistantScenario = "signal_now_4h" | "paperbot_last_trade" | "radar_top_candidate" | "ui_faq";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
};

function nowIso(): string {
    return new Date().toISOString();
}

function titleForScenario(s: AssistantScenario): string {
    switch (s) {
        case "signal_now_4h":
            return "Сигнал сейчас (4H)";
        case "paperbot_last_trade":
            return "Почему PaperBot открыл/закрыл";
        case "radar_top_candidate":
            return "Сводка Radar (топ-кандидат)";
        case "ui_faq":
            return "FAQ по интерфейсу";
    }
}

function apiBase(): string {
    return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function AssistantChat() {
    const [scenario, setScenario] = useState<AssistantScenario>("signal_now_4h");
    const [messages, setMessages] = useState<ChatMessage[]>(() => [
        {
            id: crypto.randomUUID(),
            role: "assistant",
            createdAt: nowIso(),
            content:
                "Я ассистент внутри платформы. Нажмите сценарий сверху или задайте вопрос — я отвечаю строго по фактам из системы (без инвестсоветов).",
        },
    ]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sessionId = useMemo(() => {
        const k = "assistant:v1:session_id";
        const existing = localStorage.getItem(k);
        if (existing) return existing;
        const next = crypto.randomUUID();
        localStorage.setItem(k, next);
        return next;
    }, []);

    const listRef = useRef<HTMLDivElement>(null);

    const scrollToBottomSoon = () => {
        requestAnimationFrame(() => {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        });
    };

    const send = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        setError(null);
        setIsSending(true);

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", createdAt: nowIso(), content: trimmed };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        scrollToBottomSoon();

        try {
            const res = await fetch(`${apiBase()}/api/assistant/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                cache: "no-store",
                body: JSON.stringify({
                    session_id: sessionId,
                    scenario,
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

            const botMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", createdAt: nowIso(), content: reply };
            setMessages((prev) => [...prev, botMsg]);
            scrollToBottomSoon();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Неизвестная ошибка";
            setError(msg);
            setMessages((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    createdAt: nowIso(),
                    content:
                        "Сейчас ассистент недоступен (ошибка вызова API). Это ожидаемо до подключения бэкенд-роута. Детали: " + msg,
                },
            ]);
            scrollToBottomSoon();
        } finally {
            setIsSending(false);
        }
    };

    const chipBase =
        "rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition focus-visible:outline-none focus-visible:ring-2";

    const scenarioChip = (s: AssistantScenario) => {
        const active = s === scenario;
        return (
            <button
                key={s}
                type="button"
                onClick={() => setScenario(s)}
                className={`${chipBase} ${
                    active
                        ? "border-fuchsia-400/35 bg-fuchsia-400/12 text-fuchsia-50 shadow-[0_0_0_1px_rgba(232,121,249,0.12)] focus-visible:ring-fuchsia-400/35"
                        : "border-white/12 bg-white/[0.04] text-white/75 hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-cyan-400/25"
                }`}
            >
                {titleForScenario(s)}
            </button>
        );
    };

    return (
        <section className="rounded-2xl border border-fuchsia-400/18 bg-[linear-gradient(165deg,rgba(14,17,23,0.92),rgba(10,12,18,0.88))] p-4 shadow-[0_0_0_1px_rgba(232,121,249,0.05),0_18px_48px_rgba(0,0,0,0.35)] md:p-5">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200/90">
                        <Bot className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                        LLM-ассистент
                    </div>
                    <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/50">
                        Ответы строятся строго по фактам из системы. Если в фактах нет поля — ассистент должен это сказать.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {scenarioChip("signal_now_4h")}
                    {scenarioChip("paperbot_last_trade")}
                    {scenarioChip("radar_top_candidate")}
                    {scenarioChip("ui_faq")}
                </div>
            </header>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                <div className="min-h-[320px] rounded-xl border border-white/10 bg-black/28">
                    <div
                        ref={listRef}
                        className="max-h-[360px] overflow-y-auto p-3"
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
                                                    : "border-white/10 bg-white/[0.03] text-white/80"
                                            }`}
                                        >
                                            <div className="whitespace-pre-wrap">{m.content}</div>
                                            <div className="mt-1 text-[10px] tabular-nums text-white/35">
                                                {new Date(m.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <form
                        className="flex items-end gap-2 border-t border-white/10 p-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void send(input);
                        }}
                    >
                        <label className="flex-1">
                            <span className="sr-only">Сообщение</span>
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                rows={2}
                                placeholder="Например: «Объясни текущий сигнал»"
                                className="min-h-[44px] w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-[12px] text-white/85 outline-none transition placeholder:text-white/25 focus:border-fuchsia-400/30 focus:ring-1 focus:ring-fuchsia-400/15"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={isSending || !input.trim()}
                            className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fuchsia-50 shadow-[0_0_0_1px_rgba(232,121,249,0.12)] transition hover:bg-fuchsia-400/18 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/35"
                        >
                            <Send className="h-3.5 w-3.5" aria-hidden />
                            {isSending ? "Отправка…" : "Отправить"}
                        </button>
                    </form>
                </div>

                <aside className="rounded-xl border border-white/10 bg-black/28 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-200/85">
                        <Sparkles className="h-4 w-4 opacity-90" aria-hidden />
                        Контроль качества (v1)
                    </div>
                    <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-white/55">
                        <li>— Никаких ключей/секретов на клиенте.</li>
                        <li>— Один запрос к модели на сообщение.</li>
                        <li>— Если данных нет в фактах — ответ “нет в данных”.</li>
                        <li>— Без инвестсоветов: только интерпретация состояния системы.</li>
                    </ul>
                    {error ? (
                        <div className="mt-3 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[12px] text-rose-50">
                            Ошибка: <span className="tabular-nums">{error}</span>
                        </div>
                    ) : (
                        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white/45">
                            Endpoint: <span className="tabular-nums">{apiBase()}/api/assistant/chat</span>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}

