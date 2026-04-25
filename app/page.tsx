import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardHome } from "@/components/views/dashboard-home";

export default function HomePage() {
    return (
        <DashboardShell>
            <DashboardHome />
        </DashboardShell>
    );
}
