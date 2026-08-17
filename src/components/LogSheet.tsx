import type { ComponentProps } from "react";

import { LogSheet as LogSheetRoot } from "@/features/logging/LogSheetRoot";

type LogSheetProps = ComponentProps<typeof LogSheetRoot>;

export function LogSheet(props: LogSheetProps) {
  // Log forms keep local draft state. Force a fresh form instance whenever the
  // selected calendar day changes so a previous-day Sleep/Body entry can never
  // reuse today's draft values.
  const formKey = `${props.date}:${props.initial ?? "menu"}:${props.open ? "open" : "closed"}`;
  return <LogSheetRoot key={formKey} {...props} />;
}
