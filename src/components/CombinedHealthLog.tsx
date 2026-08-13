import { Ico } from "@/components/icons/BixboIcons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CombinedHealthLogPreview() {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Type</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-md ring-2 ring-foreground/70 ring-offset-2 ring-offset-background">
            <Ico e="🌡️" size={16} /> Temp / Sleep / Weight
          </button>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-tint px-3 text-xs font-semibold text-foreground ring-1 ring-border">
            <Ico e="♨️" size={16} /> Heat / Cold / TENS
          </button>
        </div>
        <div className="max-w-[320px] pt-1">
          <p className="text-xs font-medium text-muted-foreground">Time</p>
          <Input type="time" className="mt-1" />
        </div>
      </div>

      <section className="space-y-4 border-t border-border/60 pt-4">
        <p className="text-sm font-bold">If Temp / Sleep / Weight</p>
        <label className="block"><span className="text-xs font-medium text-muted-foreground">New temperature measurement</span><Input placeholder="36,6 °C" className="mt-1" /></label>
        <label className="block"><span className="text-xs font-medium text-muted-foreground">New weight measurement</span><Input placeholder="62,5 kg" className="mt-1" /></label>
        <label className="block"><span className="text-xs font-medium text-muted-foreground">Sleep (hours)</span><Input placeholder="8" className="mt-1" /></label>
      </section>

      <section className="space-y-4 border-t border-border/60 pt-4">
        <p className="text-sm font-bold">If Heat / Cold / TENS</p>
        <div className="flex gap-2">
          <button className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"><Ico e="♨️" size={16} /> Heat</button>
          <button className="rounded-full bg-tint px-4 py-2 text-xs font-semibold ring-1 ring-border"><Ico e="🧊" size={16} /> Cold</button>
          <button className="rounded-full bg-tint px-4 py-2 text-xs font-semibold ring-1 ring-border"><Ico e="⭐" size={16} /> TENS</button>
        </div>
        <label className="block"><span className="text-xs font-medium text-muted-foreground">Start</span><Input type="time" className="mt-1" /></label>
        <div><span className="text-xs font-medium text-muted-foreground">Duration (min)</span><div className="mt-1 flex gap-2"><Input placeholder="20" /><button className="rounded-full bg-tint px-4 text-xs font-semibold ring-1 ring-border">Ongoing</button></div></div>
        <label className="block"><span className="text-xs font-medium text-muted-foreground">Note (optional)</span><Textarea rows={4} className="mt-1" /></label>
      </section>
    </div>
  );
}
