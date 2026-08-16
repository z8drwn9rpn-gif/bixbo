import { Profiler, useLayoutEffect, useRef, type ReactNode } from "react";

import { recordComponentRender } from "@/lib/appFlightRecorder";

type DiagnosticProfilerProps = {
  id: string;
  children: ReactNode;
};

export function DiagnosticProfiler({ id, children }: DiagnosticProfilerProps) {
  const startedAt = typeof performance !== "undefined" ? performance.now() : 0;
  const commitCount = useRef(0);
  const diagnosticScreen = typeof window !== "undefined" && window.location.pathname.startsWith("/diagnostics");

  useLayoutEffect(() => {
    if (diagnosticScreen || !startedAt || typeof performance === "undefined") return;
    commitCount.current += 1;
    const duration = performance.now() - startedAt;
    recordComponentRender(
      id,
      commitCount.current === 1 ? "mount-commit" : "update-commit",
      duration,
      duration,
    );
  });

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
