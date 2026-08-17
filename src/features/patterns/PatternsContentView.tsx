import "@/features/insights/insights-3d.css";
import type { PatternsContentModel } from "./usePatternsContentModel";
import { PatternsContentViewPart1 } from "./PatternsContentViewPart1";
import { PatternsContentViewPart2 } from "./PatternsContentViewPart2";
import { PatternsCycleDashboard } from "./PatternsCycleDashboard";
import { PatternsMonthlyDashboard } from "./PatternsMonthlyDashboard";
import { InsightsJumpControl } from "./InsightsJumpControl";
import { PatternTabs } from "./shared";

export function PatternsContentView({ model }: { model: PatternsContentModel }) {
  const customDashboard = model.activeTab === "cycle" || model.activeTab === "monthly";

  return (
    <div
      id="bixbo-insights-content"
      data-bixbo-insights-dashboard="true"
      className="space-y-3 px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-3 lg:space-y-0 lg:px-0 lg:pb-12 [&>*:first-child]:lg:col-span-2"
    >
      <InsightsJumpControl refreshKey={String(model.activeTab)} />
      {customDashboard ? (
        <>
          <PatternTabs active={model.activeTab} onChange={model.setActiveTab} hideCycle={model.cycleTrackingHidden} />
          {model.activeTab === "cycle" ? <PatternsCycleDashboard model={model} /> : <PatternsMonthlyDashboard model={model} />}
        </>
      ) : (
        <PatternsContentViewPart1 model={model} />
      )}
      <PatternsContentViewPart2 model={model} />
    </div>
  );
}
