import { TopBar } from "@/components/sections/top-bar";
import { ChartPanel } from "@/components/sections/chart-panel";
import { IntradaySignal } from "@/components/sections/intraday-signal";
import { ConfluenceMatrix } from "@/components/sections/confluence-matrix";
import { LiquidityPools } from "@/components/sections/liquidity-pools";
import { CatalystFeed } from "@/components/sections/catalyst-feed";
import { MarketBias } from "@/components/sections/market-bias";
import { ReversalRadar } from "@/components/sections/reversal-radar";
import { RsiGauges } from "@/components/sections/rsi-gauge";

export function DashboardHome() {
    return (
        <>
            <TopBar />

            <div className="grid gap-3 lg:grid-cols-[280px_1fr_340px] lg:items-start">
                <aside className="flex flex-col gap-3">
                    <IntradaySignal />
                    <ConfluenceMatrix />
                    <LiquidityPools />
                </aside>

                <section className="flex flex-col gap-3">
                    <ChartPanel />
                    <ReversalRadar />
                    <RsiGauges />
                </section>

                <aside className="flex flex-col gap-3">
                    <MarketBias />
                    <CatalystFeed />
                </aside>
            </div>
        </>
    );
}
