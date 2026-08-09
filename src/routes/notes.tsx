import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { AppShell } from "@/components/AppShell";
import { FoodIcon, HeartIcon, NoteIcon, StarIcon, type IconProps } from "@/components/icons/BixboIcons";
import { useBixbo, EMPTY, type Note, type NoteChecklistItem, type NoteFolder } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Archive,
  Bold,
  Check,
  ChevronLeft,
  Highlighter,
  ListChecks,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "BIXBO — Bixbo Note" },
      { name: "description", content: "Personal notes, folders, checklists and search." },
      { property: "og:title", content: "BIXBO — Bixbo Note" },
      { property: "og:description", content: "Personal notes, folders, checklists and search." },
    ],
  }),
  component: NotesPage,
});

// RESTORE_MARKER - full file continues via follow-up
function NotesPage() {
  return (
    <AppShell title="Bixbo Note">
      <div className="px-5 py-8 text-sm text-muted-foreground">Loading notes…</div>
    </AppShell>
  );
}
