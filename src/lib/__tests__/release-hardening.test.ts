import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";
import { PRIVACY_VERSION, TERMS_VERSION, HEALTH_CONSENT_VERSION } from "../legalConsent";
import { BIXBO_BOTTOM_NAV_SHADOW, BIXBO_NAV_ARTWORK_FILTER, BIXBO_NAV_LOG_ARTWORK_FILTER } from "../designTokens";
import mcp from "../mcp";
import { toolDescriptors } from "../mcp/core";

const read = (path: string) => readFileSync(path, "utf8");

describe("release hardening contracts", () => {
  it("versions all three legal acknowledgements independently", () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PRIVACY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(HEALTH_CONSENT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps product analytics free of health payload fields and navigation paths", () => {
    const source = read("src/lib/productAnalytics.ts");
    expect(source).not.toContain("pain_score");
    expect(source).not.toContain("medication_name");
    expect(source).not.toContain("note_text");
    expect(source).not.toContain("window.location");
    expect(source).not.toContain("user_id");
  });

  it("keeps every existing BIXBO MCP tool after replacing the external SDK", () => {
    expect(toolDescriptors(mcp).map((tool) => tool.name)).toEqual([
      "get_day_log", "list_recent_days", "add_day_note", "add_todo", "list_notes", "create_note", "list_medications",
    ]);
  });

  it("centralizes BottomNav shadows without changing their existing values", () => {
    expect(BIXBO_BOTTOM_NAV_SHADOW).toContain("rgba(45,58,26,.28)");
    expect(BIXBO_NAV_LOG_ARTWORK_FILTER).toContain("rgba(52,67,30,0.20)");
    expect(BIXBO_NAV_ARTWORK_FILTER).toContain("rgba(52,67,30,0.18)");
  });
});
