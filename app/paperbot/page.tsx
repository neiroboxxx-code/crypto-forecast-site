import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PaperbotView } from "@/components/views/paperbot-view";

export default function PaperbotPage() {
    return (
        <DashboardShell>
            <PaperbotView />
        </DashboardShell>
    );
}
