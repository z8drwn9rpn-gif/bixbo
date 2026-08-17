import type { ComponentProps } from "react";

import { LogSheet as LogSheetRoot } from "@/features/logging/LogSheetRoot";
import { PastDaySleepSheet } from "@/components/PastDaySleepSheet";
import { todayKey } from "@/lib/storage";

type LogSheetProps = ComponentProps<typeof LogSheetRoot>;

export function LogSheet(props: LogSheetProps) {
  // Sleep opened from a past calendar day gets a dedicated editor bound to that
  // exact date. This avoids any stale draft/current-day state leaking into the
  // previous-day entry on iOS PWA.
  if (props.initial === "temp" && props.date !== todayKey()) {
    return (
      <PastDaySleepSheet
        key={`sleep:${props.date}:${props.open ? "open" : "closed"}`}
        open={props.open}
        onOpenChange={props.onOpenChange}
        date={props.date}
        data={props.data}
        update={props.update}
      />
    );
  }

  const formKey = `${props.date}:${props.initial ?? "menu"}:${props.open ? "open" : "closed"}`;
  return <LogSheetRoot key={formKey} {...props} />;
}
