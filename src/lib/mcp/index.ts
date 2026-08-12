import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getDayLog from "./tools/get-day-log";
import listRecentDays from "./tools/list-recent-days";
import addDayNote from "./tools/add-day-note";
import addTodo from "./tools/add-todo";
import listNotes from "./tools/list-notes";
import createNote from "./tools/create-note";
import listMedications from "./tools/list-medications";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "bixbo-my-health-diary",
  title: "Bixbo: My Health Diary",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in user's BIXBO health diary. Read a day with `get_day_log`, scan history with `list_recent_days`, add day notes and todos, browse or create private notebook notes, and check the medication schedule with `list_medications`. Dates are YYYY-MM-DD and default to today.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getDayLog, listRecentDays, addDayNote, addTodo, listNotes, createNote, listMedications],
});
