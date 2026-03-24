import { PageShell } from "@/components/layout/page-shell";
import { ChartPanel } from "@/components/sections/chart-panel";
import { NewsPanel } from "@/components/sections/news-panel";
import { SetupConfirmation } from "@/components/sections/setup-confirmation";
import { SignalOverview } from "@/components/sections/signal-overview";

export default function HomePage() {
  return (
    <PageShell>
      <div className="flex w-full flex-col gap-6">
        <ChartPanel />

        <div className="grid w-full gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="flex min-w-0 flex-col gap-6">
            <SignalOverview />
            <SetupConfirmation />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <NewsPanel />
          </div>
        </div>
      </div>
    </PageShell>
  );
}