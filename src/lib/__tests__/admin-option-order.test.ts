import { describe, expect, it } from "bun:test";
import { registryFieldOptions } from "../appRegistry";
import type { BixboData } from "../storage";

describe("admin option order", () => {
  it("uses stable option values while applying registry order", () => {
    const data = { settings: { adminConfig: { features: { pain: { fields: { parts: { options: { Head: { order: 20 }, Back: { order: 10 }, "custom:test": { label: "Mine", order: 15 } } } } } } } } } as unknown as Pick<BixboData, "settings">;
    expect(registryFieldOptions(data, "pain", "parts", ["Head", "Back"])).toEqual(["Back", "custom:test", "Head"]);
  });
});
