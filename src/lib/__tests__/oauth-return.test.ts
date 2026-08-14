import { describe, expect, it } from "bun:test";
import { oauthReturnUrlForLocation, PRODUCTION_APP_ORIGIN } from "../../integrations/auth/account";

describe("BIXBO OAuth return origin", () => {
  it("never returns to localhost", () => {
    expect(oauthReturnUrlForLocation("localhost", "http://localhost:3000")).toBe(PRODUCTION_APP_ORIGIN);
    expect(oauthReturnUrlForLocation("127.0.0.1", "http://127.0.0.1:3000")).toBe(PRODUCTION_APP_ORIGIN);
    expect(oauthReturnUrlForLocation("[::1]", "http://[::1]:3000")).toBe(PRODUCTION_APP_ORIGIN);
  });

  it("never returns to Lovable preview hosts", () => {
    expect(oauthReturnUrlForLocation("bixbo.lovable.app", "https://bixbo.lovable.app")).toBe(PRODUCTION_APP_ORIGIN);
    expect(oauthReturnUrlForLocation("preview-123.lovable.app", "https://preview-123.lovable.app")).toBe(PRODUCTION_APP_ORIGIN);
  });

  it("keeps a real deployed BIXBO/custom origin", () => {
    expect(oauthReturnUrlForLocation("bixbo.z8drwn9rpn.workers.dev", PRODUCTION_APP_ORIGIN)).toBe(PRODUCTION_APP_ORIGIN);
    expect(oauthReturnUrlForLocation("health.example.com", "https://health.example.com")).toBe("https://health.example.com");
  });

  it("falls back to production if origin is unavailable", () => {
    expect(oauthReturnUrlForLocation("health.example.com", "")).toBe(PRODUCTION_APP_ORIGIN);
  });
});
