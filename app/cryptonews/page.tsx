import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CryptoNewsView } from "@/components/views/cryptonews-view";

export const dynamic = "force-dynamic";

export default function CryptoNewsPage() {
    return (
        <DashboardShell>
            <CryptoNewsView />
        </DashboardShell>
    );
}
