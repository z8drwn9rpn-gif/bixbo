import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, content) => fs.writeFileSync(path, content, "utf8");

function replaceExact(path, before, after, expected = 1) {
  const source = read(path);
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`${path}: expected ${expected} occurrence(s), found ${count}: ${before.slice(0, 120)}`);
  }
  write(path, source.split(before).join(after));
}

function replaceRegex(path, regex, replacement, expected = 1) {
  const source = read(path);
  const matches = source.match(regex);
  const count = matches?.length ?? 0;
  if (count !== expected) {
    throw new Error(`${path}: expected ${expected} regex occurrence(s), found ${count}: ${regex}`);
  }
  write(path, source.replace(regex, replacement));
}

// ---------------------------------------------------------------------------
// AUTH: keep production/preview redirect hardening, restore a deterministic
// /auth callback, remove Apple, and use the standard Supabase browser redirect.
// ---------------------------------------------------------------------------
write(
  "src/integrations/auth/account.ts",
  `import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthProvider = "google";

export const PRODUCTION_APP_ORIGIN = "https://bixbo.z8drwn9rpn.workers.dev";

export function oauthReturnUrlForLocation(hostname: string, origin: string): string {
  const normalizedHost = hostname.trim().toLowerCase();
  const isLocal = normalizedHost === "localhost" || normalizedHost === "127.0.0.1" || normalizedHost === "[::1]";
  const isLovablePreview = normalizedHost === "bixbo.lovable.app" || normalizedHost.endsWith(".lovable.app");

  // OAuth initiated from an editor/preview/local host returns to the deployed
  // BIXBO origin. This keeps preview origins out of the production auth trust
  // boundary while still giving OAuth one deterministic callback route.
  if (isLocal || isLovablePreview) return PRODUCTION_APP_ORIGIN;
  return origin || PRODUCTION_APP_ORIGIN;
}

function defaultOAuthReturnUrl(): string {
  if (typeof window === "undefined") return PRODUCTION_APP_ORIGIN;
  return oauthReturnUrlForLocation(window.location.hostname, window.location.origin);
}

function safeInternalNext(next?: string): string | undefined {
  if (!next) return undefined;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\\\") || /[\\u0000-\\u001f\\u007f]/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function oauthCallbackUrl(next?: string): string {
  const url = new URL("/auth", defaultOAuthReturnUrl());
  const safeNext = safeInternalNext(next);
  if (safeNext) url.searchParams.set("next", safeNext);
  return url.toString();
}

export function safeOAuthRedirectUrl(candidate?: string): string {
  const fallbackOrigin = defaultOAuthReturnUrl();
  if (!candidate) return oauthCallbackUrl();

  try {
    const parsed = new URL(candidate, fallbackOrigin);
    const allowedOrigins = new Set([fallbackOrigin, PRODUCTION_APP_ORIGIN]);

    // A caller can choose a path, never a foreign origin. In particular this
    // blocks protocol-relative/external redirect candidates from Profile/auth.
    if (!allowedOrigins.has(parsed.origin)) return oauthCallbackUrl();

    const safeOrigin = oauthReturnUrlForLocation(parsed.hostname, parsed.origin);
    if (safeOrigin !== parsed.origin) {
      const fallback = new URL(parsed.pathname || "/auth", safeOrigin);
      fallback.search = parsed.search;
      return fallback.toString();
    }

    return parsed.toString();
  } catch {
    return oauthCallbackUrl();
  }
}

export const accountAuth = {
  signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
    const queryParams: Record<string, string> = { ...(opts?.extraParams ?? {}) };
    if (!queryParams.prompt) queryParams.prompt = "select_account";

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: safeOAuthRedirectUrl(opts?.redirect_uri ?? oauthCallbackUrl()),
        queryParams,
      },
    });

    return { error, redirected: !error };
  },
};
`,
);

// Auth route: Google only.
replaceExact("src/routes/auth.tsx", 'const startOAuth = async (provider: "google" | "apple") => {', 'const startOAuth = async (provider: "google") => {');
replaceExact(
  "src/routes/auth.tsx",
  `        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),`,
  `        queryParams: { prompt: "select_account" },`,
);
replaceRegex(
  "src/routes/auth.tsx",
  /\n\s*<Button[^>]*onClick=\{\(\) => void startOAuth\("apple"\)\}[\s\S]*?<\/Button>/g,
  "",
);

// Profile: Google only and always return through /auth before Profile.
replaceExact(
  "src/features/profile/useProfilePageModel.tsx",
  'import { accountAuth } from "@/integrations/auth/account";',
  'import { accountAuth, oauthCallbackUrl } from "@/integrations/auth/account";',
);
replaceExact(
  "src/features/profile/useProfilePageModel.tsx",
  'const [accountAuthBusy, setAccountAuthBusy] = useState<"google" | "apple" | null>(null);',
  'const [accountAuthBusy, setAccountAuthBusy] = useState<"google" | null>(null);',
);
replaceExact(
  "src/features/profile/useProfilePageModel.tsx",
  'const startAccountOAuth = async (provider: "google" | "apple") => {',
  'const startAccountOAuth = async (provider: "google") => {',
);
replaceExact(
  "src/features/profile/useProfilePageModel.tsx",
  '      const result = await accountAuth.signInWithOAuth(provider);',
  '      const result = await accountAuth.signInWithOAuth(provider, { redirect_uri: oauthCallbackUrl("/profile") });',
);
replaceRegex(
  "src/features/profile/ProfilePageSpecialViews.tsx",
  /\n\s*<button\n\s*type="button"\n\s*onClick=\{\(\) => void startAccountOAuth\("apple"\)\}[\s\S]*?<\/button>/g,
  "",
);

// Remove now-unused Apple sign-in translations as well.
for (const path of ["src/lib/i18n/sk-4.ts"]) {
  if (!fs.existsSync(path)) continue;
  const source = read(path);
  const cleaned = source
    .split("\n")
    .filter((line) => !line.includes('"Opening Apple…"') && !line.includes('"Continue with Apple / iCloud"'))
    .join("\n");
  write(path, cleaned);
}

// Make URL callback detection explicit. Session persistence + automatic token
// refresh stay enabled.
replaceExact(
  "src/integrations/supabase/client.ts",
  `      persistSession: true,\n      autoRefreshToken: true,`,
  `      persistSession: true,\n      autoRefreshToken: true,\n      detectSessionInUrl: true,`,
);

// Stop treating a transient initial session read failure as an explicit logout.
replaceExact(
  "src/lib/cloudSync.ts",
  `      .catch((error) => {\n        console.error("useSession getSession", error);\n        setSession(null);\n      })`,
  `      .catch((error) => {\n        // A transient storage/auth read failure is not a SIGNED_OUT event.\n        // Keep the last in-memory session; onAuthStateChange remains the\n        // authority for actual sign-outs and token refreshes.\n        console.error("useSession getSession", error);\n      })`,
);

// Cloud sync already runs behind RLS. Use the persisted browser session for
// client-side account matching instead of calling /auth/v1/user for every data
// write. This removes the observed request storm without weakening server RLS.
replaceExact(
  "src/lib/cloudSync.ts",
  `  const {\n    data: { user },\n  } = await supabase.auth.getUser();\n\n  if (!user) return;\n\n  const safePayload = normalizeRemotePayload(payload);`,
  `  const {\n    data: { session },\n    error: sessionError,\n  } = await supabase.auth.getSession();\n\n  if (sessionError) throw sessionError;\n  const user = session?.user;\n  if (!user) return;\n\n  const safePayload = normalizeRemotePayload(payload);`,
  1,
);
replaceExact(
  "src/lib/cloudSync.ts",
  `            const {\n              data: { user },\n            } = await supabase.auth.getUser();\n\n            if (!user || user.id !== userId || cancelled) {`,
  `            const {\n              data: { session: activeSession },\n              error: sessionError,\n            } = await supabase.auth.getSession();\n\n            if (sessionError) {\n              queuedPushData = payload;\n              setPendingCloudSync(true);\n              throw sessionError;\n            }\n\n            if (!activeSession?.user || activeSession.user.id !== userId || cancelled) {`,
);

// ---------------------------------------------------------------------------
// PATTERNS: one semantic source of truth for change colour. Raw arrow direction
// and clinical meaning are intentionally separate.
// ---------------------------------------------------------------------------
replaceExact(
  "src/features/patterns/shared.tsx",
  `export function formatSignedPercent(value: number | null): string {\n  if (value == null || !Number.isFinite(value)) return "—";\n  if (value === 0) return "0%";\n  return \`${'${value > 0 ? "+" : ""}${value.toFixed(0)}%'}\`;\n}\n`,
  `export function formatSignedPercent(value: number | null): string {\n  if (value == null || !Number.isFinite(value)) return "—";\n  if (value === 0) return "0%";\n  return \`${'${value > 0 ? "+" : ""}${value.toFixed(0)}%'}\`;\n}\n\nexport type PatternChangeDirection = "higher-better" | "higher-worse" | "neutral";\nexport type PatternChangeTone = "good" | "bad" | "neutral";\n\nexport function changeToneFromDelta(\n  delta: number | null | undefined,\n  direction: PatternChangeDirection,\n): PatternChangeTone {\n  if (delta == null || !Number.isFinite(delta) || delta === 0 || direction === "neutral") return "neutral";\n  const improved = direction === "higher-worse" ? delta < 0 : delta > 0;\n  return improved ? "good" : "bad";\n}\n\nexport function changeToneTextClass(tone: PatternChangeTone): string {\n  if (tone === "good") return "font-bold text-emerald-700 dark:text-emerald-300";\n  if (tone === "bad") return "font-bold text-rose-600 dark:text-rose-300";\n  return "font-semibold text-muted-foreground";\n}\n\nexport function outcomeChangeDirection(outcomeId: string): PatternChangeDirection {\n  // Built-in trigger outcomes are adverse events/symptoms: a higher occurrence\n  // rate is worse. Admin-created outcomes have unknown clinical polarity and\n  // therefore stay neutral instead of guessing.\n  return outcomeId.startsWith("admin-") ? "neutral" : "higher-worse";\n}\n`,
);

replaceExact(
  "src/features/patterns/shared.tsx",
  `  const isUnchanged = delta === 0;\n\n  const improved = delta == null || isUnchanged || neutralTrend ? null : higherIsWorse ? delta < 0 : delta > 0;\n\n  const trendText =\n    delta == null\n      ? "Comparison unavailable"\n      : isUnchanged\n        ? "No change"\n        : neutralTrend\n          ? "Changed"\n          : improved\n            ? "Improved"\n            : "Worsened";\n\n  const trendColor =\n    delta == null || isUnchanged || neutralTrend\n      ? "var(--muted-foreground)"\n      : improved\n        ? CHART_COLORS.workout\n        : CHART_COLORS.headache;`,
  `  const isUnchanged = delta === 0;\n  const direction: PatternChangeDirection = neutralTrend ? "neutral" : higherIsWorse ? "higher-worse" : "higher-better";\n  const changeTone = changeToneFromDelta(delta, direction);\n  const trendClass = changeToneTextClass(changeTone);\n\n  const trendText =\n    delta == null\n      ? "Comparison unavailable"\n      : isUnchanged\n        ? "No change"\n        : neutralTrend\n          ? "Changed"\n          : changeTone === "good"\n            ? "Improved"\n            : "Worsened";`,
);
replaceExact(
  "src/features/patterns/shared.tsx",
  `<div className="flex shrink-0 items-center gap-1 text-xs font-semibold" style={{ color: trendColor }}>\n            {isUnchanged || neutralTrend ? null : improved ? (\n              <TrendingDown className="h-4 w-4" />\n            ) : (\n              <TrendingUp className="h-4 w-4" />\n            )}`,
  `<div className={\`flex shrink-0 items-center gap-1 text-xs ${'${trendClass}'}\`}>\n            {isUnchanged || neutralTrend ? null : delta < 0 ? (\n              <TrendingDown className="h-4 w-4" />\n            ) : (\n              <TrendingUp className="h-4 w-4" />\n            )}`,
);
replaceExact(
  "src/features/patterns/shared.tsx",
  `<div\n            className="mt-3 rounded-xl bg-surface/75 px-3 py-2 text-center text-xs font-semibold ring-1 ring-border/40"\n            style={{ color: trendColor }}\n          >`,
  `<div\n            className={\`mt-3 rounded-xl bg-surface/75 px-3 py-2 text-center text-xs ring-1 ring-border/40 ${'${trendClass}'}\`}\n          >`,
);
replaceExact(
  "src/features/patterns/shared.tsx",
  `          const valueClass =\n            item.tone === "good"\n              ? "text-emerald-700 dark:text-emerald-300"\n              : item.tone === "bad"\n                ? "text-rose-600 dark:text-rose-300"\n                : "text-foreground";`,
  `          const valueClass = item.tone ? changeToneTextClass(item.tone) : "font-semibold text-foreground";`,
);
replaceExact(
  "src/features/patterns/shared.tsx",
  '<span className={`text-right font-semibold ${valueClass}`}>{t(String(item.value))}</span>',
  '<span className={`text-right ${valueClass}`}>{t(String(item.value))}</span>',
);

// Monthly at-a-glance labels only become green/red when the selected item is
// actually an improvement/worsening; zero/insufficient data stays neutral.
replaceExact(
  "src/features/patterns/PatternsContentViewPart1.tsx",
  'CollapsibleSection, TriggerResult } from "./shared";',
  'CollapsibleSection, TriggerResult, changeToneTextClass } from "./shared";',
);
replaceExact(
  "src/features/patterns/PatternsContentViewPart1.tsx",
  'className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatChange(mostImproved)}</p>',
  'className={`mt-1 text-sm ${changeToneTextClass(mostImproved && mostImproved.score > 0 ? "good" : "neutral")}`}>{formatChange(mostImproved)}</p>',
);
replaceExact(
  "src/features/patterns/PatternsContentViewPart1.tsx",
  'className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-300">{formatChange(mostWorsened)}</p>',
  'className={`mt-1 text-sm ${changeToneTextClass(mostWorsened && mostWorsened.score < 0 ? "bad" : "neutral")}`}>{formatChange(mostWorsened)}</p>',
);

// Trigger correlations: a higher rate of an adverse built-in outcome is red;
// a lower rate is green. Admin-defined outcomes remain neutral because BIXBO
// cannot safely infer whether high or low is desirable.
replaceExact(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  'CollapsibleSection, TriggerResult } from "./shared";',
  'CollapsibleSection, TriggerResult, changeToneFromDelta, changeToneTextClass, outcomeChangeDirection } from "./shared";',
);
replaceExact(
  "src/features/patterns/usePatternsContentModel.tsx",
  `      outcome: string;\n      difference: number;`,
  `      outcome: string;\n      outcomeId: string;\n      difference: number;`,
);
replaceExact(
  "src/features/patterns/usePatternsContentModel.tsx",
  `          outcome: outcome.label,\n          difference,`,
  `          outcome: outcome.label,\n          outcomeId: outcome.id,\n          difference,`,
);
replaceExact(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  `                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">\n                            The outcome was {Math.abs(association.difference).toFixed(0)} percentage points{" "}\n                            {association.difference > 0 ? "more common" : "less common"} on days with this trigger.\n                          </p>`,
  `                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">\n                            The outcome was{" "}\n                            <span className={changeToneTextClass(changeToneFromDelta(association.difference, outcomeChangeDirection(association.outcomeId)))}>\n                              {Math.abs(association.difference).toFixed(0)} percentage points{" "}\n                              {association.difference > 0 ? "more common" : "less common"}\n                            </span>{" "}\n                            on days with this trigger.\n                          </p>`,
);
replaceRegex(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  /<div\n\s*className="mt-3 flex items-center justify-center gap-1\.5 rounded-xl bg-background\/60 px-3 py-2 text-xs font-semibold"\n\s*style=\{\{[\s\S]*?\}\}\n\s*>\n\s*\{triggerDifference > 0 \? \([\s\S]*?\) : null\}/g,
  `<div\n                      className={\`mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-background/60 px-3 py-2 text-xs ${'${changeToneTextClass(changeToneFromDelta(triggerDifference, outcomeChangeDirection(selectedOutcome)))}'}\`}\n                    >\n                      {triggerDifference > 0 ? (\n                        <TrendingUp className="h-4 w-4" />\n                      ) : triggerDifference < 0 ? (\n                        <TrendingDown className="h-4 w-4" />\n                      ) : null}`,
);
replaceExact(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  `                    tone:\n                      triggerDifference != null && triggerDifference > 0\n                        ? "bad"\n                        : triggerDifference != null && triggerDifference < 0\n                          ? "good"\n                          : "neutral",`,
  `                    tone: changeToneFromDelta(triggerDifference, outcomeChangeDirection(selectedOutcome)),`,
);

// OAuth regression tests now assert callback/path preservation and foreign
// origin rejection rather than treating any arbitrary deployed origin as safe.
write(
  "src/lib/__tests__/oauth-return.test.ts",
  `import { describe, expect, it } from "bun:test";\nimport { oauthReturnUrlForLocation, PRODUCTION_APP_ORIGIN, safeOAuthRedirectUrl } from "../../integrations/auth/account";\n\ndescribe("BIXBO OAuth return origin", () => {\n  it("keeps local and Lovable preview origins out of the production OAuth return boundary", () => {\n    expect(oauthReturnUrlForLocation("localhost", "http://localhost:3000")).toBe(PRODUCTION_APP_ORIGIN);\n    expect(oauthReturnUrlForLocation("127.0.0.1", "http://127.0.0.1:3000")).toBe(PRODUCTION_APP_ORIGIN);\n    expect(oauthReturnUrlForLocation("bixbo.lovable.app", "https://bixbo.lovable.app")).toBe(PRODUCTION_APP_ORIGIN);\n    expect(oauthReturnUrlForLocation("preview-123.lovable.app", "https://preview-123.lovable.app")).toBe(PRODUCTION_APP_ORIGIN);\n  });\n\n  it("keeps the deployed production origin", () => {\n    expect(oauthReturnUrlForLocation("bixbo.z8drwn9rpn.workers.dev", PRODUCTION_APP_ORIGIN)).toBe(PRODUCTION_APP_ORIGIN);\n  });\n\n  it("falls back to production if origin is unavailable", () => {\n    expect(oauthReturnUrlForLocation("health.example.com", "")).toBe(PRODUCTION_APP_ORIGIN);\n  });\n\n  it("rejects a foreign OAuth redirect origin", () => {\n    expect(safeOAuthRedirectUrl("https://evil.example/auth?next=/profile")).toBe(`${'${PRODUCTION_APP_ORIGIN}'}/auth`);\n  });\n});\n`,
);

write(
  "src/lib/__tests__/pattern-change-semantics.test.ts",
  `import { describe, expect, it } from "bun:test";\nimport { changeToneFromDelta, outcomeChangeDirection } from "../../features/patterns/shared";\n\ndescribe("Patterns semantic change tones", () => {\n  it("marks symptom reductions green and symptom increases red", () => {\n    expect(changeToneFromDelta(-2, "higher-worse")).toBe("good");\n    expect(changeToneFromDelta(2, "higher-worse")).toBe("bad");\n  });\n\n  it("marks beneficial metric increases green and decreases red", () => {\n    expect(changeToneFromDelta(12, "higher-better")).toBe("good");\n    expect(changeToneFromDelta(-12, "higher-better")).toBe("bad");\n  });\n\n  it("does not invent clinical meaning for sleep, weight or custom metrics", () => {\n    expect(changeToneFromDelta(3, "neutral")).toBe("neutral");\n    expect(changeToneFromDelta(-3, "neutral")).toBe("neutral");\n    expect(outcomeChangeDirection("admin-threshold:pain:custom")).toBe("neutral");\n  });\n\n  it("treats built-in trigger outcomes as adverse outcomes", () => {\n    expect(outcomeChangeDirection("panic")).toBe("higher-worse");\n    expect(outcomeChangeDirection("histamineFlare")).toBe("higher-worse");\n    expect(changeToneFromDelta(15, outcomeChangeDirection("panic"))).toBe("bad");\n    expect(changeToneFromDelta(-15, outcomeChangeDirection("panic"))).toBe("good");\n  });\n});\n`,
);

// Guard: Apple authentication must be gone from active auth/profile code.
for (const path of [
  "src/routes/auth.tsx",
  "src/integrations/auth/account.ts",
  "src/features/profile/useProfilePageModel.tsx",
  "src/features/profile/ProfilePageSpecialViews.tsx",
]) {
  const source = read(path);
  if (/signInWithOAuth\([\s\S]{0,80}apple|startOAuth\("apple"\)|startAccountOAuth\("apple"\)|Continue with Apple/i.test(source)) {
    throw new Error(`${path}: Apple auth reference remains`);
  }
}

console.log("Applied auth/session and Patterns semantic-colour fixes.");
