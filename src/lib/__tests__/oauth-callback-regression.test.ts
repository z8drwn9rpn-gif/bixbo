import { describe, expect, it } from "vitest";
import { oauthCallbackErrorMessage, safeOAuthSearchText } from "../../integrations/auth/oauthCallback";

describe("OAuth callback regressions", () => {
  it("sanitizes provider error text before it reaches the UI", () => {
    expect(safeOAuthSearchText("  invalid\u0000client\nsecret  ")).toBe("invalid client secret");
    expect(safeOAuthSearchText(123)).toBe("");
    expect(safeOAuthSearchText("x".repeat(600))).toHaveLength(500);
  });

  it("turns Google invalid_client failures into a stable user-facing message", () => {
    const message = oauthCallbackErrorMessage({
      oauthError: "server_error",
      oauthErrorCode: "unexpected_failure",
      oauthErrorDescription: "Unable to exchange external code: invalid_client — The provided client secret is invalid.",
    });

    expect(message).toBe(
      "Google sign-in is temporarily unavailable because its OAuth client configuration was rejected. Please try again after the Google sign-in configuration is corrected.",
    );
    expect(message).not.toContain("client secret is invalid");
  });

  it("keeps a safe provider description for other OAuth failures", () => {
    expect(oauthCallbackErrorMessage({ oauthError: "access_denied", oauthErrorDescription: "The request was cancelled." })).toBe(
      "The request was cancelled.",
    );
    expect(oauthCallbackErrorMessage({})).toBeNull();
  });

  it("passes friendly fallback messages through the active translator", () => {
    const translated = oauthCallbackErrorMessage(
      { oauthError: "server_error", oauthErrorDescription: "invalid_client" },
      (key) => `translated:${key}`,
    );
    expect(translated?.startsWith("translated:Google sign-in is temporarily unavailable")).toBe(true);
  });
});
