import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PersonalAccountView } from "@/components/views/personal-account-view";

export default function TradeCalendarPage() {
    return (
        <DashboardShell>
            <PersonalAccountView />
        </DashboardShell>
    );
}
