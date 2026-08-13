import { createContext, useContext } from "react";
import { registryCustomFieldsForFeature, type RegistryFeatureId } from "@/lib/appRegistry";
import type { BixboData, CustomLogValue } from "@/lib/storage";

export type LogSchemaContextValue = {
  data: BixboData;
  featureId: RegistryFeatureId;
  adminFields: ReturnType<typeof registryCustomFieldsForFeature>;
  adminFieldValues: Record<string, CustomLogValue>;
  setAdminFieldValue: (fieldId: string, value: CustomLogValue) => void;
  saveAdminCustomFields: () => void;
  sourceEntryId: string;
} | null;

export const LogSchemaContext = createContext<LogSchemaContextValue>(null);

export function useLogSchema() {
  return useContext(LogSchemaContext);
}
