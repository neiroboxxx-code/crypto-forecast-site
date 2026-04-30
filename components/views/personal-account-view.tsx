"use client";

import { CabinetUserCard } from "@/components/sections/personal-account/cabinet-user-card";
import { AssistantChat } from "@/components/sections/personal-account/assistant-chat";
import { TradingJournal } from "@/components/sections/personal-account/trading-journal";

/**
 * Личный кабинет (мультипользовательский задел): контент будет зависеть от сессии / userId после auth + billing.
 * Маршрут пока `/trade-calendar` — URL можно сменить позже с редиректом.
 */
export function PersonalAccountView() {
    return (
        <div className="flex flex-col gap-2" aria-label="Личный кабинет">
            <div className="flex justify-end">
                <CabinetUserCard />
            </div>
            <AssistantChat />
            <TradingJournal />
        </div>
    );
}
