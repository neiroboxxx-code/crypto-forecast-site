import { useId } from "react";

type Props = {
    /** Чуть крупнее для «вылезающего» угла */
    size?: "md" | "lg";
    /**
     * true — бот запущен: левый глаз зелёный, правый красный, моргание по очереди (как сейчас по фазам).
     * false — остановлен: оба глаза только в зелёной гамме.
     */
    botActive?: boolean;
};

/**
 * Декоративный маскот Paperbot — вектор, без внешних файлов.
 */
export function PaperbotMascot({ size = "md", botActive = false }: Props) {
    const uid = useId().replace(/:/g, "");
    const bodyGradId = `paperbot-body-${uid}`;
    const glassGradId = `paperbot-glass-${uid}`;
    const redGlassGradId = `paperbot-red-glass-${uid}`;
    const dim = size === "lg" ? "h-[4.75rem] w-[4.75rem] sm:h-[5.25rem] sm:w-[5.25rem]" : "h-14 w-14 sm:h-16 sm:w-16";

    return (
        <div className={`relative shrink-0 select-none ${dim}`} aria-hidden>
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-transparent to-cyan-500/15 blur-md" />
            <svg
                viewBox="0 0 72 72"
                className="relative h-full w-full drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id={bodyGradId} x1="18" y1="14" x2="54" y2="58" gradientUnits="userSpaceOnUse">
                        <stop stopColor="rgba(52, 211, 153, 0.28)" />
                        <stop offset="1" stopColor="rgba(34, 211, 238, 0.14)" />
                    </linearGradient>
                    <linearGradient id={glassGradId} x1="26" y1="30" x2="46" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="rgba(34, 211, 238, 0.45)" />
                        <stop offset="1" stopColor="rgba(52, 211, 153, 0.18)" />
                    </linearGradient>
                    <linearGradient id={redGlassGradId} x1="26" y1="30" x2="46" y2="42" gradientUnits="userSpaceOnUse">
                        <stop stopColor="rgba(251, 113, 133, 0.52)" />
                        <stop offset="1" stopColor="rgba(244, 63, 94, 0.2)" />
                    </linearGradient>
                </defs>
                <path
                    d="M36 8v10"
                    stroke="rgba(52,211,153,0.5)"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <circle cx="36" cy="6" r="3" fill="rgba(52,211,153,0.55)" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                <rect
                    x="16"
                    y="20"
                    width="40"
                    height="38"
                    rx="10"
                    fill={`url(#${bodyGradId})`}
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1.25"
                />
                <rect x="22" y="28" width="28" height="18" rx="4" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <rect
                    x="24"
                    y="30"
                    width="11"
                    height="14"
                    rx="2"
                    fill={`url(#${glassGradId})`}
                    className="animate-paperbot-eye-l"
                />
                <rect
                    x="37"
                    y="30"
                    width="11"
                    height="14"
                    rx="2"
                    fill={`url(#${botActive ? redGlassGradId : glassGradId})`}
                    className="animate-paperbot-eye-r"
                />
                <circle cx="36" cy="52" r="2.5" fill="rgba(52,211,153,0.7)" className="animate-paperbot-standby" />
                <path d="M24 62h24" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round" />
                <path d="M28 58v4M44 58v4" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </div>
    );
}
