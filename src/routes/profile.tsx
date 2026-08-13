import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { postpartumProgress } from "@/lib/health";
import { ArrowLeft, Plus, X, Pencil, ChevronRight, Check } from "@/components/icons/BixboIcons";
import { AppShell } from "@/components/AppShell";
import {
  BabyIcon,
  CalendarIcon,
  ClockIcon,
  DropIcon,
  HeartIcon,
  LeafIcon,
  NoteIcon,
  PillIcon,
  PregnancyIcon,
  ProfileIcon,
  StarIcon,
  StethoscopeIcon,
  TaskIcon,
  WarningIcon,
  WeightIcon,
  WorkoutIcon,
} from "@/components/icons/BixboIcons";
import {
  useBixbo,
  getBixbo,
  EMPTY,
  todayKey,
  latestRecordedWeight,
  userAllergens,
  userGender,
  isPregnancyActive,
  isPostpartumActive,
  normalizeBixboBackup,
  replaceBixbo,
  createBixboSafetyBackup,
  getBixboSafetyBackup,
  type BixboData,
  type HealthProfile,
  type Doctor,
  type EmergencyContact,
} from "@/lib/storage";
import { mergeBixbo } from "@/lib/merge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { createCloudBackup } from "@/lib/cloudSync";
import { useI18n } from "@/hooks/useI18n";
import type { AppLanguage } from "@/lib/i18n";
import { isDeviceAdminEnabled } from "@/lib/deviceAdmin";
import { ProfilePage } from "@/features/profile/ProfilePage";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Health profile — BIXBO" },
      {
        name: "description",
        content: "Your personal, medical, cycle, lifestyle, emergency and medication profile in BIXBO.",
      },
      { property: "og:title", content: "Health profile — BIXBO" },
      { property: "og:description", content: "Everything about you, in one editable place." },
    ],
  }),
  component: ProfilePage,
});
