import fs from "node:fs";
import { describe, expect, it } from "vitest";

const googleButton = fs.readFileSync("src/integrations/auth/GoogleSignInButton.tsx", "utf8");
const authRoute = fs.readFileSync("src/routes/auth.tsx", "utf8");
const accountAuth = fs.readFileSync("src/integrations/auth/account.ts", "utf8");
const workerServer = fs.readFileSync("src/server.ts", "utf8");
const staticHeaders = fs.readFileSync("public/_headers", "utf8");

describe("Google browser ID-token auth", () => {
  it("uses the configured public Google Web client id and GIS script", () => {
    expect(googleButton).toContain(
      '"545023380659-ovg56o3vo09oari9g02qodvdbtt42hep.apps.googleusercontent.com"',
    );
    expect(googleButton).toContain('"https://accounts.google.com/gsi/client"');
    expect(googleButton).toContain("VITE_GOOGLE_WEB_CLIENT_ID");
  });

  it("signs the Google credential into Supabase as an ID token with a nonce", () => {
    expect(googleButton).toContain('digest("SHA-256"');
    expect(googleButton).toContain("onCredentialRef.current(response.credential, nonce.raw)");
    expect(googleButton).not.toContain("supabase");
    expect(authRoute).toContain("supabase.auth.signInWithIdToken({");
    expect(authRoute).toContain('provider: "google"');
    expect(authRoute).toContain("token: credential");
    expect(authRoute).toContain("nonce: rawNonce");
  });

  it("does not send primary or legacy Google entry points through Supabase OAuth code exchange", () => {
    expect(authRoute).toContain("<GoogleSignInButton");
    expect(authRoute).not.toContain("signInWithOAuth");
    expect(accountAuth).not.toContain("supabase.auth.signInWithOAuth");
    expect(accountAuth).toContain("googleIdentityEntryUrl(next, true)");
  });

  it("allows Google Identity Services through both production CSP layers", () => {
    for (const csp of [workerServer, staticHeaders]) {
      expect(csp).toContain("script-src 'self' 'unsafe-inline' https://accounts.google.com");
      expect(csp).toContain("connect-src 'self' https://accounts.google.com");
      expect(csp).toContain("frame-src https://accounts.google.com");
    }
  });
});
