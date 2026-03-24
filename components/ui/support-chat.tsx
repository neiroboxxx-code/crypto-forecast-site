"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

type ChatMessage = {
    id: string;
    role: "assistant" | "user";
    text: string;
};

export function SupportChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            text: "Здравствуйте. Я помощник на сайте. Можете написать вопрос, и я помогу с навигацией, услугами или анализом.",
        },
    ]);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping, isOpen]);

    function sendMessage() {
        const value = input.trim();
        if (!value) return;

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            text: value,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        window.setTimeout(() => {
            const botMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                text: "Это пока демо-версия чата. Следующим шагом мы подключим реального помощника через API и сделаем ответы по данным сайта.",
            };

            setMessages((prev) => [...prev, botMessage]);
            setIsTyping(false);
        }, 700);
    }

    return (
        <div className="fixed bottom-5 right-5 z-[90]">
            <div className="relative">
                <div
                    className={`absolute bottom-20 right-0 w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[#07090f]/95 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ${isOpen
                            ? "pointer-events-auto translate-y-0 opacity-100"
                            : "pointer-events-none translate-y-4 opacity-0"
                        }`}
                >
                    <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/70">
                                    Chat Support
                                </div>
                                <h3 className="mt-1 text-sm font-medium text-white">
                                    Помощник на сайте
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-white/55">
                                    Онлайн-чат для вопросов по сигналам, аналитике и навигации.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                                aria-label="Закрыть чат"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="h-[360px] overflow-y-auto px-4 py-4">
                        <div className="space-y-3">
                            {messages.map((message) => {
                                const isAssistant = message.role === "assistant";

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-[20px] px-4 py-3 text-sm leading-relaxed ${isAssistant
                                                    ? "border border-white/10 bg-white/[0.05] text-white/82"
                                                    : "bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/20"
                                                }`}
                                        >
                                            {message.text}
                                        </div>
                                    </div>
                                );
                            })}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/55">
                                        Печатает...
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    <div className="border-t border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-end gap-2">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                rows={1}
                                placeholder="Напишите сообщение..."
                                className="max-h-28 min-h-[46px] flex-1 resize-none rounded-[18px] border border-white/10 bg-[#0b0e14] px-4 py-3 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-cyan-300/30"
                            />

                            <button
                                type="button"
                                onClick={sendMessage}
                                className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-[16px] border border-cyan-300/20 bg-cyan-400/15 text-cyan-100 transition hover:scale-[1.03] hover:bg-cyan-400/20 active:scale-[0.98]"
                                aria-label="Отправить"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setIsOpen((prev) => !prev)}
                    className="group flex h-14 items-center gap-3 rounded-full border border-cyan-300/20 bg-[#0b0e14]/95 px-5 text-white shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:scale-[1.02] hover:border-cyan-300/30 hover:bg-[#10141d]"
                >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/20">
                        <MessageCircle size={18} />
                    </span>

                    <div className="text-left">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                            Support
                        </div>
                        <div className="text-sm text-white/88">Чат-помощник</div>
                    </div>
                </button>
            </div>
        </div>
    );
}