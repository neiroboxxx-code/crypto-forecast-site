import { ReactNode } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { DashboardNav } from "@/components/layout/dashboard-nav";

type DashboardShellProps = {
    children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
    return (
        <PageShell>
            <div className="flex flex-col gap-3">
                <DashboardNav />
                {children}
            </div>
        </PageShell>
    );
}
