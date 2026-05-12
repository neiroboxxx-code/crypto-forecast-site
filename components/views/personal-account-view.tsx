"use client";

import { CabinetUserCard } from "@/components/sections/personal-account/cabinet-user-card";
import { TradingJournal } from "@/components/sections/personal-account/trading-journal";

/**
 * Личный кабинет (мультипользовательский задел): контент будет зависеть от сессии / userId после auth + billing.
 */
export function PersonalAccountView() {
    return (
        <div className="flex flex-col gap-3" aria-label="Личный кабинет">
            <div className="flex items-center justify-end">
                <CabinetUserCard />
            </div>
            <TradingJournal />
        </div>
    );
}
