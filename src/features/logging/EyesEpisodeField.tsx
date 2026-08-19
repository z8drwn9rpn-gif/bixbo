import { LogSchemaContext } from "@/features/logging/LogSchemaContext";
import { Chip, Field, type UpdateFn } from "./LogFormPrimitives";
import { EyesForm, type EyesEpisode } from "./EyesForm";

export type { EyesEpisode } from "./EyesForm";

export function EyesEpisodeField({
  date,
  update,
  active,
  setActive,
  setDraft,
}: {
  date: string;
  update: UpdateFn;
  active: boolean;
  setActive: (active: boolean) => void;
  setDraft: (entry: EyesEpisode | undefined) => void;
}) {
  return (
    <div>
      <Field label="Eyes?">
        <div className="mt-1 flex gap-2">
          <Chip active={!active} onClick={() => { setActive(false); setDraft(undefined); }}>
            No
          </Chip>
          <Chip active={active} onClick={() => setActive(true)}>
            Yes — log it
          </Chip>
        </div>
      </Field>
      {active && (
        <div className="mt-3 rounded-2xl border border-border p-3">
          <LogSchemaContext.Provider value={null}>
            <EyesForm
              date={date}
              update={update}
              onDone={() => setActive(false)}
              embedded
              onDraftChange={setDraft}
            />
          </LogSchemaContext.Provider>
        </div>
      )}
    </div>
  );
}
