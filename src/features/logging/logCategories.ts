export type Category =
  | "postpartum"
  | "meds"
  | "pain"
  | "panic"
  | "tetany"
  | "period"
  | "sex"
  | "heat"
  | "food"
  | "bowel"
  | "workout"
  | "temp"
  | "task"
  | "event"
  | "note"
  | `custom:${string}`;

export const CATEGORIES: { id: Category; label: string; emoji: string; hint: string }[] = [
  { id: "postpartum", label: "Postpartum symptoms", emoji: "🤱", hint: "Recovery symptoms · notes" },
  { id: "pain", label: "Pain", emoji: "🔥", hint: "0–10, body, quality" },
  { id: "tetany", label: "Tetany", emoji: "⭐", hint: "Type · location · intensity" },
  { id: "panic", label: "Panic attack", emoji: "✨", hint: "Intensity · symptoms · trigger" },
  { id: "period", label: "Blueberry", emoji: "🫐", hint: "Flow · discharge · notes" },
  { id: "heat", label: "Heat / Cold / TENS", emoji: "♨️", hint: "Therapy · body area · relief" },
  { id: "food", label: "Food", emoji: "🍽️", hint: "Food · allergens · reaction" },
  { id: "bowel", label: "Bowel / Urinary", emoji: "💩", hint: "Bowel or urinary entry" },
  { id: "sex", label: "ŠukŠuk!", emoji: "❤️", hint: "Activity · protection · symptoms" },
  { id: "workout", label: "Workout", emoji: "🧘🏼‍♀️", hint: "Type · duration · response" },
  { id: "temp", label: "Measurements", emoji: "🌡️", hint: "Temperature · weight · sleep" },
  { id: "meds", label: "Meds", emoji: "💊", hint: "Taken · extra dose" },
  { id: "event", label: "Event", emoji: "📅", hint: "Multi-day · time · note" },
  { id: "task", label: "Task", emoji: "✅", hint: "To-do with date & time" },
  { id: "note", label: "Note & plan", emoji: "📝", hint: "Event · to-do · note" },
];