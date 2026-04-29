/** Стабильный id: один паттерн на страницу /academy. */
const ACADEMY_SWING_PATTERN_ID = "academySwingGrid";

/**
 * Чуть заметная фон-подложка для /academy: повтор абстрактных «ломаных»
 * в стиле price action, без кричащих цветов.
 */
export function AcademyPageBackdrop() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern
                        id={ACADEMY_SWING_PATTERN_ID}
                        width={168}
                        height={112}
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M -8 74 L28 48 L62 71 L104 42 L138 62 L174 54"
                            fill="none"
                            stroke="rgba(34,211,238,0.07)"
                            strokeWidth={0.9}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                        <path
                            d="M -4 94 L42 106 L74 82 L118 104 L154 84 L176 94"
                            fill="none"
                            stroke="rgba(52,211,153,0.045)"
                            strokeWidth={0.75}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                        <path
                            d="M 12 18 L52 34 L92 22 L134 46 L168 30"
                            fill="none"
                            stroke="rgba(255,255,255,0.035)"
                            strokeWidth={0.65}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#${ACADEMY_SWING_PATTERN_ID})`} />
            </svg>
            {/* лёгкая виньетка: центр чуть светлее для читаемости контента */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_-10%,rgba(34,211,238,0.04),transparent_52%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0C12]/85 via-transparent to-black/55" />
        </div>
    );
}
