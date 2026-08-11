import { describe, expect, it } from "bun:test";
import { mergeAdminConfigs } from "../effectiveAdminConfig";
import type { AdminConfig } from "../appRegistry";

describe("universal admin page config", () => {
  it("preserves unknown additive page customization data through admin config merge", () => {
    const globalConfig = {
      enabled: true,
      universalPages: {
        "/meds": {
          blocks: {
            "meds:0:scheduled": { label: "My medicines", order: 0 },
          },
        },
      },
    } as AdminConfig & { universalPages: Record<string, unknown> };

    const merged = mergeAdminConfigs(globalConfig, {} as AdminConfig) as AdminConfig & {
      universalPages?: Record<string, unknown>;
    };

    expect(merged.universalPages?.["/meds"]).toBeDefined();
  });
});
