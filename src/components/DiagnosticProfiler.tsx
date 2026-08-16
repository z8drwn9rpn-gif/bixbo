import { Profiler, type ReactNode } from "react";

import { recordComponentRender } from "@/lib/appFlightRecorder";

type DiagnosticProfilerProps = {
  id: string;
  children: ReactNode;
};

export function DiagnosticProfiler({ id, children }: DiagnosticProfilerProps) {
  return (
    <Profiler
      id={id}
      onRender={(profileId, phase, actualDuration, baseDuration) => {
        recordComponentRender(profileId, phase, actualDuration, baseDuration);
      }}
    >
      {children}
    </Profiler>
  );
}
