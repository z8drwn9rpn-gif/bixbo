import type {} from "./types";

export type EyesStoredPainIntensity = "none" | "something" | "mild" | "moderate" | "severe";

export interface EyesStoredEpisode {
  id: string;
  time: string;
  affected: "left" | "right" | "both";
  painIntensity?: EyesStoredPainIntensity;
  painWithMovement: boolean;
  visionChanges: string[];
  note?: string;
}

declare module "./types" {
  interface DayLog {
    eyes?: EyesStoredEpisode[];
  }
}
