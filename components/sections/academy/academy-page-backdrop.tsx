import Image from "next/image";

const REF_IMG = "/Gemini_Generated_Image_ik7oybik7oybik7o.png";

/**
 * Фон только для /academy: полный вьюпорт (`fixed inset-0`), чтобы не образовывался «квадрат»
 * по ширине max-w контейнера. Изображение сильно приглушено под тёмную тему сайта.
 */
export function AcademyPageBackdrop() {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0">
                <Image
                    alt=""
                    src={REF_IMG}
                    fill
                    sizes="100vw"
                    className="scale-[1.06] transform object-cover object-[50%_36%] brightness-[0.42] saturate-[0.52] contrast-[1.04]"
                    priority={false}
                />
            </div>

            {/* Сведение спектра к базовым #0B0F18 / #070911 + лёгкий cyan как на карточках */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F18]/93 via-[#0A0C12]/74 to-[#070911]/93" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_64%_-4%,rgba(34,211,238,0.055),transparent_44%)]" />
            {/* Мягкая виньетка по краям, без резкой «рамки» */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,9,17,0.55)_74%,rgba(4,8,14,0.88)_110%)]" />
        </div>
    );
}
