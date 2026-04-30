import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PersonalAccountView } from "@/components/views/personal-account-view";

export default function AccountPage() {
    return (
        <DashboardShell>
            <PersonalAccountView />
        </DashboardShell>
    );
}

