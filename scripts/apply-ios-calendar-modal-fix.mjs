import fs from "node:fs";

const path = "src/components/MonthCalendar.tsx";
let source = fs.readFileSync(path, "utf8");

const replacements = [
  [
    'className="flex max-h-[calc(100dvh-40px)] w-full max-w-[370px] flex-col overflow-hidden rounded-[30px] border border-border/70 bg-background shadow-[0_24px_70px_-30px_rgba(24,31,17,.55),0_6px_20px_-12px_rgba(24,31,17,.35)]"',
    'className="flex max-h-[72dvh] w-full max-w-[370px] flex-col overflow-hidden rounded-[30px] border border-border/70 bg-background shadow-[0_24px_70px_-30px_rgba(24,31,17,.55),0_6px_20px_-12px_rgba(24,31,17,.35)] sm:max-h-[76dvh] lg:max-h-[78dvh]"',
  ],
  [
    '<button type="button" onClick={()=>setEventsOpen(false)} aria-label={t("Close")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border/70 bg-tint/70 text-lg font-bold text-foreground">×</button>',
    '<button type="button" onClick={()=>setEventsOpen(false)} aria-label={t("Close")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border/70 bg-tint/70 text-lg font-bold text-foreground">×</button>',
  ],
];

for (const [before, after] of replacements) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one match for ${before.slice(0, 90)}, found ${count}`);
  source = source.replace(before, after);
}

fs.writeFileSync(path, source, "utf8");
console.log("Applied compact calendar timeline modal sizing.");
