import { ChartPanel } from "@/components/sections/chart-panel";
import { NewsPanel } from "@/components/sections/news-panel";
import { SetupConfirmation } from "@/components/sections/setup-confirmation";
import { SignalOverview } from "@/components/sections/signal-overview";
import { StatusPill } from "@/components/ui/status-pill";

export function HeroSection() {
    return (
        <section className="flex w-full items-center py-6">
            <div className="w-full">
                <div className="mb-8 flex flex-wrap gap-3">
                    <StatusPill label="Current Signal" accent />
                    <StatusPill label="Confidence" />
                    <StatusPill label="Market Context" />
                    <StatusPill label="Trend Structure" />
                    <StatusPill label="Levels" />
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.3fr]">
                    <div className="flex h-full flex-col gap-6">
                        <SignalOverview />
                        <div className="flex-1">
                            <SetupConfirmation />
                        </div>
                    </div>

                    <div className="flex h-full flex-col gap-6">
                        <ChartPanel />
                        <NewsPanel />
                    </div>
                </div>
            </div>
        </section>
    );
}