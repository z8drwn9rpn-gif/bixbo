import { describe, expect, it } from "bun:test";
import { EMPTY, type CustomLogEntry } from "../storage";
import { registryCustomFieldsForFeature } from "../appRegistry";

describe("admin-added fields on core logs", () => {
  it("exposes supplementary fields without changing core pain schema", () => {
    const data = structuredClone(EMPTY);
    data.settings.adminConfig = {
      features: {
        pain: {
          customFields: [
            { id: "admin_field_1", label: "Aura", kind: "toggle", order: 10, enabled: true },
            { id: "admin_field_2", label: "Jaw pressure", kind: "scale", order: 20, enabled: true, scale: { min: 0, max: 5, step: 1 } },
          ],
        },
      },
    };

    const fields = registryCustomFieldsForFeature(data, "pain");
    expect(fields.map((field) => field.id)).toEqual(["admin_field_1", "admin_field_2"]);
    expect(data.dayLogs).toEqual({});
  });

  it("stores supplementary entries separately from core health entries", () => {
    const data = structuredClone(EMPTY);
    const entry: CustomLogEntry = {
      id: "extra-1",
      time: "12:30",
      values: { admin_field_1: true, admin_field_2: 3 },
    };
    data.dayLogs["2026-08-11"] = { adminFields: { pain: [entry] } };

    expect(data.dayLogs["2026-08-11"]?.adminFields?.pain?.[0]?.values.admin_field_2).toBe(3);
    expect(data.dayLogs["2026-08-11"]?.pain).toBeUndefined();
  });
});
