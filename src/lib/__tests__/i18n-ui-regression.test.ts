import { describe, expect, it } from "vitest";
import { EN } from "@/lib/i18n/en";
import { SK } from "@/lib/i18n/sk";

describe("critical UI copy", () => {
  it("keeps Food post-meal feeling wording explicit", () => {
    expect(EN.Feel).toBe("How I feel after food");
    expect(SK.Feel).toBe("Ako sa cítim po jedle");
  });

  it("keeps current signup password wording translated", () => {
    expect(EN["Password (min 8 chars)"]).toBe("Password (min 8 chars)");
    expect(SK["Password (min 8 chars)"]).toBe("Heslo (min. 8 znakov)");
    expect(SK.Password).toBe("Heslo");
  });
});
