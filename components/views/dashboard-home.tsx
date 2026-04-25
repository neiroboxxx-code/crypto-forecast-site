import { TopBar } from "@/components/sections/top-bar";
import { ChartPanel } from "@/components/sections/chart-panel";
import { IntradaySignal } from "@/components/sections/intraday-signal";
import { ConfluenceMatrix } from "@/components/sections/confluence-matrix";
import { CatalystFeed } from "@/components/sections/catalyst-feed";
import { MarketBias } from "@/components/sections/market-bias";
import { ReversalRadar } from "@/components/sections/reversal-radar";

export function DashboardHome() {
    return (
        <>
            <TopBar />

            <div className="grid gap-3 lg:grid-cols-[280px_1fr_340px] lg:items-start">
                <aside className="flex flex-col gap-3">
                    <IntradaySignal />
                    <ConfluenceMatrix />
                </aside>

                <section className="flex flex-col gap-3">
                    <ChartPanel />
                    <ReversalRadar />
                </section>

                <aside className="flex flex-col gap-3">
                    <MarketBias />
                    <CatalystFeed />
                </aside>
            </div>
        </>
    );
}
