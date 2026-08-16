import { Profiler, type ReactNode } from "react";

import { recordComponentRender } from "@/lib/appFlightRecorder";

type DiagnosticProfilerProps = {
  id: string;
  children: ReactNode;
};

export function DiagnosticProfiler({ id, children }: DiagnosticProfilerProps) {
  const diagnosticScreen = typeof window !== "undefined" && window.location.pathname.startsWith("/diagnostics");

  return (
    <Profiler
      id={id}
      onRender={(profileId, phase, actualDuration, baseDuration) => {
        if (diagnosticScreen) return;
        recordComponentRender(profileId, `react-${phase}`, actualDuration, baseDuration);
      }}
    >
      {children}
    </Profiler>
  );
}
