import type { ComponentProps } from "react";

import { LogSheet as LogSheetRoot } from "@/features/logging/LogSheetRoot";
import { PastDaySleepSheet } from "@/components/PastDaySleepSheet";

type LogSheetProps = ComponentProps<typeof LogSheetRoot>;

export function LogSheet(props: LogSheetProps) {
  // A direct Sleep action must always use the date-bound editor. Keeping this
  // independent from "today" avoids iOS/PWA stale state and also gives the user
  // an explicit date field, so yesterday can be selected even if the calendar
  // selection did not visually update yet.
  if (props.initial === "temp") {
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
