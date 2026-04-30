"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Cpu, GraduationCap, LayoutDashboard, Newspaper, UserRound } from "lucide-react";

const items = [
    { href: "/", label: "Дашборд", labelEn: "Dashboard", icon: LayoutDashboard },
    { href: "/academy", label: "Академия", labelEn: "Academy", icon: GraduationCap },
    { href: "/cryptonews", label: "CryptoNews", labelEn: "CryptoNews", icon: Newspaper },
    { href: "/paperbot", label: "Пейпербот", labelEn: "Paperbot", icon: Bot },
    { href: "/under-the-hood", label: "Under the Hood", labelEn: "Inside", icon: Cpu },
    { href: "/trade-calendar", label: "Личный кабинет", labelEn: "Account", icon: UserRound },
] as const;

export function DashboardNav() {
    const pathname = usePathname();

    return (
        <nav
            className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-[#0E1117]/80 p-1.5"
            aria-label="Основные разделы"
        >
            {items.map(({ href, label, labelEn, icon: Icon }) => {
                const active =
                    href === "/"
                        ? pathname === "/" || pathname === ""
                        : pathname === href || pathname.startsWith(`${href}/`);

                return (
                    <Link
                        key={href}
                        href={href}
                        className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition sm:flex-none sm:justify-start ${
                            active
                                ? "border border-cyan-400/35 bg-cyan-400/10 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
                                : "border border-transparent text-white/50 hover:border-white/10 hover:bg-white/5 hover:text-white/80"
                        }`}
                    >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden" title={label}>
                            {labelEn}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
