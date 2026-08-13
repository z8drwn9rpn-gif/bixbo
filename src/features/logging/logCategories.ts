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
  { id: "period", label: "Blueberry", emoji: "🫐", hint: "Flow · discharge · notes" },
  { id: "heat", label: "Heat / Cold / TENS", emoji: "♨️", hint: "Heating, ice or TENS session" },
  { id: "food", label: "Food", emoji: "🍽️", hint: "What & how you feel" },
  { id: "bowel", label: "Bowel", emoji: "💩", hint: "Bristol type" },
  { id: "sex", label: "ŠukŠuk!", emoji: "❤️", hint: "All kinds of activity" },
  { id: "workout", label: "Workout", emoji: "🧘🏼‍♀️", hint: "Type · duration · weight" },
  { id: "temp", label: "Temp / Sleep / Weight", emoji: "🌡️", hint: "°C · kg · hours" },
  { id: "meds", label: "Meds", emoji: "💊", hint: "Taken · extra dose" },
  { id: "event", label: "Note & plan", emoji: "📝", hint: "Event · To do · Note" },
  { id: "task", label: "Task", emoji: "✅", hint: "To-do with date & time" },
  { id: "note", label: "Notes", emoji: "📝", hint: "Any thought for today" },
];
