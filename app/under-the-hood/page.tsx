import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UnderTheHoodView } from "@/components/views/under-the-hood-view";

export default function UnderTheHoodPage() {
    return (
        <DashboardShell>
            <UnderTheHoodView />
        </DashboardShell>
    );
}
