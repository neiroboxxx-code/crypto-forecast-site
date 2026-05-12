"use client";

import { useState } from "react";
import { CabinetUserCard } from "@/components/sections/personal-account/cabinet-user-card";
import { AssistantChat } from "@/components/sections/personal-account/assistant-chat";
import { TradingJournal } from "@/components/sections/personal-account/trading-journal";

/**
 * Личный кабинет (мультипользовательский задел): контент будет зависеть от сессии / userId после auth + billing.
 * Маршрут пока `/trade-calendar` — URL можно сменить позже с редиректом.
 */
export function PersonalAccountView() {
    const [activeTab, setActiveTab] = useState<"assistant" | "journal">("assistant");

    const tabs: Array<{
        id: "assistant" | "journal";
        label: string;
        hint: string;
        activeClass: string;
    }> = [
        {
            id: "assistant",
            label: "Ассистент",
            hint: "LLM-чат + сценарии",
            activeClass: "border-fuchsia-400/35 bg-fuchsia-400/10 text-fuchsia-50",
        },
        {
            id: "journal",
            label: "Журнал",
            hint: "Торговые заметки",
            activeClass: "border-cyan-400/35 bg-cyan-400/10 text-cyan-50",
        },
    ];

    return (
        <div className="flex flex-col gap-3" aria-label="Личный кабинет">
            <div className="flex items-center justify-end">
                <CabinetUserCard />
            </div>

            {/* Tab bar (как в Академии): показываем одну секцию за раз */}
            <div className="rounded-xl border border-white/8 bg-[#0E1117]/80 p-1">
                <div className="flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((t) => {
                        const active = t.id === activeTab;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id)}
                                className={`flex shrink-0 flex-col rounded-lg border px-3 py-2 text-left transition ${
                                    active
                                        ? t.activeClass
                                        : "border-transparent text-white/50 hover:border-white/10 hover:bg-white/5 hover:text-white/85"
                                }`}
                            >
                                <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em]">
                                    {t.label}
                                </span>
                                <span className={`mt-0.5 text-[10px] ${active ? "text-white/55" : "text-white/35"}`}>
                                    {t.hint}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeTab === "assistant" ? <AssistantChat /> : <TradingJournal />}
        </div>
    );
}
