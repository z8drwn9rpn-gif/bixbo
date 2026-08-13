import { Ico } from "@/components/icons/BixboIcons";

export function CombinedHealthLogPreview() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className="rounded-full bg-primary px-4 py-2 text-primary-foreground"><Ico e="🌡️" size={16} /> Temp / Sleep / Weight</button>
        <button className="rounded-full bg-tint px-4 py-2"><Ico e="♨️" size={16} /> Heat / Cold / TENS</button>
      </div>
    </div>
  );
}
