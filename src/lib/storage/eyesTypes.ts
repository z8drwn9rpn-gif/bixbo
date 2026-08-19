import type {} from "./types";

export interface EyesStoredEpisode {
  id: string;
  time: string;
  affected: "left" | "right" | "both";
  painWithMovement: boolean;
  visionChanges: string[];
  note?: string;
}

declare module "./types" {
  interface DayLog {
    eyes?: EyesStoredEpisode[];
  }
}
