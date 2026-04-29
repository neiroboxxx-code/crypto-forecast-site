import { ReactNode } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { DashboardNav } from "@/components/layout/dashboard-nav";

type DashboardShellProps = {
    children: ReactNode;
    /** Неактивная подложка за навигацией и контентом (строго визуал). */
    ornament?: ReactNode;
};

export function DashboardShell({ children, ornament }: DashboardShellProps) {
    return (
        <PageShell>
            <div className={`relative ${ornament ? "min-h-[100dvh]" : ""}`}>
                {ornament}
                <div className="relative z-[1] flex flex-col gap-3">
                    <DashboardNav />
                    {children}
                </div>
            </div>
        </PageShell>
    );
}
