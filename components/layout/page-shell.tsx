import { ReactNode } from "react";
import { TradeCompanion } from "@/components/widgets/trade-companion";

type PageShellProps = {
    children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
    return (
        <main className="min-h-screen w-full bg-[#0A0C12] text-[var(--color-text)]">
            <div className="mx-auto w-full max-w-[1760px] px-4 py-3 md:px-5 md:py-4">
                {children}
            </div>
            <TradeCompanion />
        </main>
    );
}
