import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TrendTradingView } from "@/components/views/trend-trading-view";

export const metadata = {
    title: "Trend Trading — Crypto Platform",
    description: "HTF Scanner: trend regime, entry signal, key levels for 7 instruments",
};

export default function TrendTradingPage() {
    return (
        <DashboardShell>
            <TrendTradingView />
        </DashboardShell>
    );
}
