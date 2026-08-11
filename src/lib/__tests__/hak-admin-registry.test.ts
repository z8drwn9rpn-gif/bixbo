import { describe, expect, it } from "bun:test";

import { getRegistryFeature } from "../appRegistry";
import { EMPTY } from "../storage";

describe("HAK admin label integration", () => {
  it("uses the effective ŠukŠuk registry label without changing health logs", () => {
    const data = structuredClone(EMPTY);
    data.dayLogs["2026-08-11"] = {
      sex: [{ id: "s1", time: "21:00", kind: "sex" }],
    };
    data.settings.adminConfig = {
      features: { sex: { label: "Intimacy" } },
    };

    expect(getRegistryFeature(data, "sex").label).toBe("Intimacy");
    expect(data.dayLogs["2026-08-11"]?.sex?.[0]?.kind).toBe("sex");
  });
});
