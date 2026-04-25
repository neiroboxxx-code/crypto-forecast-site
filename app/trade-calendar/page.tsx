import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TradeCalendarView } from "@/components/views/trade-calendar-view";

export default function TradeCalendarPage() {
    return (
        <DashboardShell>
            <TradeCalendarView />
        </DashboardShell>
    );
}

