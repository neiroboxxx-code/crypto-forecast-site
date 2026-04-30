"use client";

import { TradingJournal } from "@/components/sections/personal-account/trading-journal";

/**
 * Личный кабинет (мультипользовательский задел): контент будет зависеть от сессии / userId после auth + billing.
 * Маршрут пока `/trade-calendar` — URL можно сменить позже с редиректом.
 */
export function PersonalAccountView() {
    return (
        <div className="flex flex-col gap-4" aria-label="Личный кабинет">
            <header className="rounded-2xl border border-white/8 bg-[#0E1117]/60 px-4 py-4 md:px-5">
                <h1 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Личный кабинет</h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/58">
                    Ниже — интерактивный торговый журнал (черновик без постоянного хранения).
                </p>
            </header>

            <TradingJournal />
        </div>
    );
}
