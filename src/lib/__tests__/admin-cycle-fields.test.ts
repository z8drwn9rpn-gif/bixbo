import { describe, expect, it } from "bun:test";
import { registryAdminCycleFieldsForFeature, type AdminConfig } from "../appRegistry";
import { EMPTY } from "../storage";

const data = (config: AdminConfig) => ({
  ...EMPTY,
  settings: { ...EMPTY.settings, adminConfig: config },
});

describe("admin Cycle fields", () => {
  it("exposes only explicitly selected numeric or scale fields", () => {
    expect(
      registryAdminCycleFieldsForFeature(
        data({
          features: {
            pain: {
              cycleFieldIds: ["a", "b"],
              customFields: [
                { id: "a", label: "A", kind: "number", order: 1 },
                { id: "b", label: "B", kind: "text", order: 2 },
              ],
            },
          },
        }),
        "pain",
      ).map((field) => field.id),
    ).toEqual(["a"]);
  });
});
