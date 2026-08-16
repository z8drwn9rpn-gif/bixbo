import { describe, expect, it } from "bun:test";
import { oauthReturnUrlForLocation, PRODUCTION_APP_ORIGIN, safeOAuthRedirectUrl } from "../../integrations/auth/account";

describe("BIXBO OAuth return origin", () => {
  it("keeps local development origins out of the production OAuth boundary", () => {
    expect(oauthReturnUrlForLocation("localhost", "http://localhost:3000")).toBe(PRODUCTION_APP_ORIGIN);
    expect(oauthReturnUrlForLocation("127.0.0.1", "http://127.0.0.1:3000")).toBe(PRODUCTION_APP_ORIGIN);
  });

  it("keeps the deployed production origin", () => {
    expect(oauthReturnUrlForLocation("bixbo.z8drwn9rpn.workers.dev", PRODUCTION_APP_ORIGIN)).toBe(PRODUCTION_APP_ORIGIN);
  });

  it("rejects a foreign OAuth redirect origin", () => {
    expect(safeOAuthRedirectUrl("https://evil.example/auth?next=/profile")).toBe(PRODUCTION_APP_ORIGIN + "/auth");
  });
});
