import { ReactNode } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { DashboardDataProvider } from "@/components/providers/dashboard-data-provider";

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
                <div className="relative z-[2] flex flex-col gap-3">
                    <DashboardNav />
                    <DashboardDataProvider>{children}</DashboardDataProvider>
                </div>
            </div>
        </PageShell>
    );
}
