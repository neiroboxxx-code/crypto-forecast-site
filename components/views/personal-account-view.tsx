"use client";

import { CabinetUserCard } from "@/components/sections/personal-account/cabinet-user-card";
import { TradingJournal } from "@/components/sections/personal-account/trading-journal";

/**
 * Личный кабинет (мультипользовательский задел): контент будет зависеть от сессии / userId после auth + billing.
 * Маршрут пока `/trade-calendar` — URL можно сменить позже с редиректом.
 */
export function PersonalAccountView() {
    return (
        <div className="flex flex-col gap-4" aria-label="Личный кабинет">
            <header className="flex items-center gap-3">
                <h1 className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Личный кабинет</h1>
                <CabinetUserCard />
            </header>

            <TradingJournal />
        </div>
    );
}
