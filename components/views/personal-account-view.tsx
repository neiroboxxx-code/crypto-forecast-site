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
            <header className="rounded-2xl border border-white/8 bg-[#0E1117]/60 px-4 py-4 md:px-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Личный кабинет</h1>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/58">
                            Ниже — интерактивный торговый журнал. Имя в карточке справа видно только вам на этом устройстве до появления
                            полноценного входа по аккаунту.
                        </p>
                    </div>
                    <CabinetUserCard />
                </div>
            </header>

            <TradingJournal />
        </div>
    );
}
