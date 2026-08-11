import { describe, expect, it } from "bun:test";
import { EMPTY } from "../storage";
import { registryFieldOptions, registryOptionLabel } from "../appRegistry";

describe("admin custom core-log options", () => {
  it("adds configured custom options without removing core options", () => {
    const data = structuredClone(EMPTY);
    data.settings.adminConfig = {
      features: {
        pain: {
          fields: {
            parts: {
              options: {
                "custom:abc123": { label: "Jaw", enabled: true, order: 1000 },
              },
            },
          },
        },
      },
    };

    const values = registryFieldOptions(data, "pain", "parts", ["Head", "Neck"]);
    expect(values).toContain("Head");
    expect(values).toContain("Neck");
    expect(values).toContain("custom:abc123");
    expect(registryOptionLabel(data, "pain", "parts", "custom:abc123")).toBe("Jaw");
  });

  it("can hide core options while keeping a custom option available", () => {
    const data = structuredClone(EMPTY);
    data.settings.adminConfig = {
      features: {
        pain: {
          fields: {
            quality: {
              options: {
                Sharp: { enabled: false },
                "custom:q1": { label: "Electric", enabled: true, order: 1000 },
              },
            },
          },
        },
      },
    };

    expect(registryFieldOptions(data, "pain", "quality", ["Sharp", "Dull"])).toEqual(["Dull", "custom:q1"]);
  });
});
