"use client";

/**
 * Личный кабинет (мультипользовательский задел): контент будет зависеть от сессии / userId после auth + billing.
 * Маршрут пока `/trade-calendar` — URL можно сменить позже с редиректом.
 */
export function PersonalAccountView() {
    return (
        <div className="min-h-[40vh] rounded-2xl border border-white/8 bg-[#0E1117]/40" aria-label="Личный кабинет">
            {/* Заготовка под блоки пользователя — заполним при появлении auth */}
        </div>
    );
}
