import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, content) => fs.writeFileSync(path, content, "utf8");

function mustReplace(path, before, after, expected = 1) {
  const source = read(path);
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(`${path}: expected ${expected} occurrence(s), found ${count}: ${before.slice(0, 140)}`);
  }
  write(path, source.split(before).join(after));
}

function mustRegex(path, regex, replacement, expected = 1) {
  const source = read(path);
  const matches = source.match(regex);
  const count = matches?.length ?? 0;
  if (count !== expected) {
    throw new Error(`${path}: expected ${expected} regex occurrence(s), found ${count}: ${regex}`);
  }
  write(path, source.replace(regex, replacement));
}

// ---------------------------------------------------------------------------
// Google OAuth + session stability
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
  if (isLocal || isLovablePreview) return PRODUCTION_APP_ORIGIN;
  return origin || PRODUCTION_APP_ORIGIN;
}

function defaultOAuthOrigin(): string {
  if (typeof window === "undefined") return PRODUCTION_APP_ORIGIN;
  return oauthReturnUrlForLocation(window.location.hostname, window.location.origin);
}

function safeInternalNext(next?: string): string | undefined {
  if (!next) return undefined;
  const value = next.trim();
  const hasControl = [...value].some((char) => {
    const code = char.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\\\") || hasControl) return undefined;
  try {
    const base = new URL("https://bixbo.invalid");
    const parsed = new URL(value, base);
    if (parsed.origin !== base.origin) return undefined;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return undefined;
  }
}

export function oauthCallbackUrl(next?: string): string {
  const url = new URL("/auth", defaultOAuthOrigin());
  const safeNext = safeInternalNext(next);
  if (safeNext) url.searchParams.set("next", safeNext);
  return url.toString();
}

export function safeOAuthRedirectUrl(candidate?: string): string {
  const fallbackOrigin = defaultOAuthOrigin();
  if (!candidate) return oauthCallbackUrl();

  try {
    const parsed = new URL(candidate, fallbackOrigin);
    const allowedOrigins = new Set([fallbackOrigin, PRODUCTION_APP_ORIGIN]);
    if (!allowedOrigins.has(parsed.origin)) return oauthCallbackUrl();

    const safeOrigin = oauthReturnUrlForLocation(parsed.hostname, parsed.origin);
    const target = new URL(parsed.pathname || "/auth", safeOrigin);
    target.search = parsed.search;
    target.hash = parsed.hash;
    return target.toString();
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

mustReplace(
  "src/routes/auth.tsx",
  'const startOAuth = async (provider: "google" | "apple") => {',
  'const startOAuth = async (provider: "google") => {',
);
mustReplace(
  "src/routes/auth.tsx",
  '          ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),',
  '          queryParams: { prompt: "select_account" },',
);
mustReplace(
  "src/routes/auth.tsx",
  '        <Button variant="outline" className="min-h-11 w-full" onClick={() => void startOAuth("apple")} disabled={busy}>{t("Continue with Apple / iCloud")}</Button>\n',
  "",
);

mustReplace(
  "src/features/profile/useProfilePageModel.tsx",
  'import { accountAuth } from "@/integrations/auth/account";',
  'import { accountAuth, oauthCallbackUrl } from "@/integrations/auth/account";',
);
mustReplace(
  "src/features/profile/useProfilePageModel.tsx",
  'const [accountAuthBusy, setAccountAuthBusy] = useState<"google" | "apple" | null>(null);',
  'const [accountAuthBusy, setAccountAuthBusy] = useState<"google" | null>(null);',
);
mustReplace(
  "src/features/profile/useProfilePageModel.tsx",
  'const startAccountOAuth = async (provider: "google" | "apple") => {',
  'const startAccountOAuth = async (provider: "google") => {',
);
mustReplace(
  "src/features/profile/useProfilePageModel.tsx",
  '      const result = await accountAuth.signInWithOAuth(provider);',
  '      const result = await accountAuth.signInWithOAuth(provider, { redirect_uri: oauthCallbackUrl("/profile") });',
);

mustRegex(
  "src/features/profile/ProfilePageSpecialViews.tsx",
  /\n\s*<button\n\s*type="button"\n\s*onClick=\{\(\) => void startAccountOAuth\("apple"\)\}[\s\S]*?<\/button>/g,
  "",
);

if (fs.existsSync("src/lib/i18n/sk-4.ts")) {
  const path = "src/lib/i18n/sk-4.ts";
  write(
    path,
    read(path)
      .split("\n")
      .filter((line) => !line.includes('"Opening Apple…"') && !line.includes('"Continue with Apple / iCloud"'))
      .join("\n"),
  );
}

mustReplace(
  "src/integrations/supabase/client.ts",
  "      persistSession: true,\n      autoRefreshToken: true,",
  "      persistSession: true,\n      autoRefreshToken: true,\n      detectSessionInUrl: true,",
);

mustReplace(
  "src/lib/cloudSync.ts",
  '      .catch((error) => {\n        console.error("useSession getSession", error);\n        setSession(null);\n      })',
  '      .catch((error) => {\n        // A transient initial storage/auth read failure is not an explicit logout.\n        // onAuthStateChange remains the source of truth for real SIGNED_OUT events.\n        console.error("useSession getSession", error);\n      })',
);

mustReplace(
  "src/lib/cloudSync.ts",
  '  const {\n    data: { user },\n  } = await supabase.auth.getUser();\n\n  if (!user) return;\n\n  const safePayload = normalizeRemotePayload(payload);',
  '  const {\n    data: { session },\n    error: sessionError,\n  } = await supabase.auth.getSession();\n\n  if (sessionError) throw sessionError;\n  const user = session?.user;\n  if (!user) return;\n\n  const safePayload = normalizeRemotePayload(payload);',
);

mustReplace(
  "src/lib/cloudSync.ts",
  '            const {\n              data: { user },\n            } = await supabase.auth.getUser();\n\n            if (!user || user.id !== userId || cancelled) {',
  '            const {\n              data: { session: activeSession },\n              error: sessionError,\n            } = await supabase.auth.getSession();\n\n            if (sessionError) {\n              queuedPushData = payload;\n              setPendingCloudSync(true);\n              throw sessionError;\n            }\n\n            if (!activeSession?.user || activeSession.user.id !== userId || cancelled) {',
);

// ---------------------------------------------------------------------------
// Patterns: semantic red/green decisions shared across every comparison view.
// ---------------------------------------------------------------------------
write(
  "src/lib/patternChangeSemantics.ts",
  `export type PatternChangeDirection = "higher-better" | "higher-worse" | "neutral";
export type PatternChangeTone = "good" | "bad" | "neutral";

export function changeToneFromDelta(
  delta: number | null | undefined,
  direction: PatternChangeDirection,
): PatternChangeTone {
  if (delta == null || !Number.isFinite(delta) || delta === 0 || direction === "neutral") return "neutral";
  const improved = direction === "higher-worse" ? delta < 0 : delta > 0;
  return improved ? "good" : "bad";
}

export function changeToneTextClass(tone: PatternChangeTone): string {
  if (tone === "good") return "font-bold text-emerald-700 dark:text-emerald-300";
  if (tone === "bad") return "font-bold text-rose-600 dark:text-rose-300";
  return "font-semibold text-muted-foreground";
}

export function outcomeChangeDirection(outcomeId: string): PatternChangeDirection {
  // Every built-in trigger outcome is an adverse symptom/event or an adverse
  // threshold (pain, low energy, negative mood, poor sleep, etc.). A higher
  // occurrence rate is therefore worse. Admin-defined outcomes remain neutral
  // because BIXBO cannot infer the user's desired direction safely.
  return outcomeId.startsWith("admin-") ? "neutral" : "higher-worse";
}
`,
);

mustReplace(
  "src/features/patterns/shared.tsx",
  'import { useI18n } from "@/hooks/useI18n";',
  'import { useI18n } from "@/hooks/useI18n";\nimport { changeToneFromDelta, changeToneTextClass, type PatternChangeDirection } from "@/lib/patternChangeSemantics";',
);

mustReplace(
  "src/features/patterns/shared.tsx",
  '  const isUnchanged = delta === 0;\n\n  const improved = delta == null || isUnchanged || neutralTrend ? null : higherIsWorse ? delta < 0 : delta > 0;\n\n  const trendText =\n    delta == null\n      ? "Comparison unavailable"\n      : isUnchanged\n        ? "No change"\n        : neutralTrend\n          ? "Changed"\n          : improved\n            ? "Improved"\n            : "Worsened";\n\n  const trendColor =\n    delta == null || isUnchanged || neutralTrend\n      ? "var(--muted-foreground)"\n      : improved\n        ? CHART_COLORS.workout\n        : CHART_COLORS.headache;',
  '  const isUnchanged = delta === 0;\n  const direction: PatternChangeDirection = neutralTrend ? "neutral" : higherIsWorse ? "higher-worse" : "higher-better";\n  const changeTone = changeToneFromDelta(delta, direction);\n  const trendClass = changeToneTextClass(changeTone);\n\n  const trendText =\n    delta == null\n      ? "Comparison unavailable"\n      : isUnchanged\n        ? "No change"\n        : neutralTrend\n          ? "Changed"\n          : changeTone === "good"\n            ? "Improved"\n            : "Worsened";',
);

mustReplace(
  "src/features/patterns/shared.tsx",
  '<div className="flex shrink-0 items-center gap-1 text-xs font-semibold" style={{ color: trendColor }}>\n            {isUnchanged || neutralTrend ? null : improved ? (\n              <TrendingDown className="h-4 w-4" />\n            ) : (\n              <TrendingUp className="h-4 w-4" />\n            )}',
  '<div className={`flex shrink-0 items-center gap-1 text-xs ${trendClass}`}>\n            {isUnchanged || neutralTrend ? null : delta < 0 ? (\n              <TrendingDown className="h-4 w-4" />\n            ) : (\n              <TrendingUp className="h-4 w-4" />\n            )}',
);

mustReplace(
  "src/features/patterns/shared.tsx",
  '<div\n            className="mt-3 rounded-xl bg-surface/75 px-3 py-2 text-center text-xs font-semibold ring-1 ring-border/40"\n            style={{ color: trendColor }}\n          >',
  '<div className={`mt-3 rounded-xl bg-surface/75 px-3 py-2 text-center text-xs ring-1 ring-border/40 ${trendClass}`}>',
);

mustReplace(
  "src/features/patterns/shared.tsx",
  '          const valueClass =\n            item.tone === "good"\n              ? "text-emerald-700 dark:text-emerald-300"\n              : item.tone === "bad"\n                ? "text-rose-600 dark:text-rose-300"\n                : "text-foreground";',
  '          const valueClass = item.tone ? changeToneTextClass(item.tone) : "font-semibold text-foreground";',
);
mustReplace(
  "src/features/patterns/shared.tsx",
  '<span className={`text-right font-semibold ${valueClass}`}>{t(String(item.value))}</span>',
  '<span className={`text-right ${valueClass}`}>{t(String(item.value))}</span>',
);

mustReplace(
  "src/features/patterns/PatternsContentViewPart1.tsx",
  'import type { PatternsContentModel } from "./usePatternsContentModel";',
  'import { changeToneTextClass } from "@/lib/patternChangeSemantics";\nimport type { PatternsContentModel } from "./usePatternsContentModel";',
);
mustReplace(
  "src/features/patterns/PatternsContentViewPart1.tsx",
  'className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300"',
  'className={`mt-1 text-sm ${changeToneTextClass(mostImproved && mostImproved.score > 0 ? "good" : "neutral")}`}',
);
mustReplace(
  "src/features/patterns/PatternsContentViewPart1.tsx",
  'className="mt-1 text-sm font-semibold text-rose-600 dark:text-rose-300"',
  'className={`mt-1 text-sm ${changeToneTextClass(mostWorsened && mostWorsened.score < 0 ? "bad" : "neutral")}`}',
);

mustReplace(
  "src/features/patterns/usePatternsContentModel.tsx",
  '      outcome: string;\n      difference: number;',
  '      outcome: string;\n      outcomeId: string;\n      difference: number;',
);
mustReplace(
  "src/features/patterns/usePatternsContentModel.tsx",
  '          outcome: outcome.label,\n          difference,',
  '          outcome: outcome.label,\n          outcomeId: outcome.id,\n          difference,',
);

mustReplace(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  'import type { PatternsContentModel } from "./usePatternsContentModel";',
  'import { changeToneFromDelta, changeToneTextClass, outcomeChangeDirection } from "@/lib/patternChangeSemantics";\nimport type { PatternsContentModel } from "./usePatternsContentModel";',
);

mustReplace(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  '                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">\n                            The outcome was {Math.abs(association.difference).toFixed(0)} percentage points{" "}\n                            {association.difference > 0 ? "more common" : "less common"} on days with this trigger.\n                          </p>',
  '                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">\n                            The outcome was{" "}\n                            <span className={changeToneTextClass(changeToneFromDelta(association.difference, outcomeChangeDirection(association.outcomeId)))}>\n                              {Math.abs(association.difference).toFixed(0)} percentage points{" "}\n                              {association.difference > 0 ? "more common" : "less common"}\n                            </span>{" "}\n                            on days with this trigger.\n                          </p>',
);

mustReplace(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  '                      className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-background/60 px-3 py-2 text-xs font-semibold"\n                      style={{\n                        color:\n                          triggerDifference > 0\n                            ? CHART_COLORS.headache\n                            : triggerDifference < 0\n                              ? CHART_COLORS.workout\n                              : "var(--muted-foreground)",\n                      }}',
  '                      className={`mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-background/60 px-3 py-2 text-xs ${changeToneTextClass(changeToneFromDelta(triggerDifference, outcomeChangeDirection(selectedOutcome)))}`}',
);

mustReplace(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  '                    tone:\n                      triggerDifference != null && triggerDifference > 0\n                        ? "bad"\n                        : triggerDifference != null && triggerDifference < 0\n                          ? "good"\n                          : "neutral",',
  '                    tone: changeToneFromDelta(triggerDifference, outcomeChangeDirection(selectedOutcome)),',
);

mustReplace(
  "src/features/patterns/PatternsContentViewPart2.tsx",
  '                          className={`mt-2 text-sm font-bold ${\n                            association.difference > 0\n                              ? "text-rose-600 dark:text-rose-300"\n                              : "text-emerald-700 dark:text-emerald-300"\n                          }`}',
  '                          className={`mt-2 text-sm ${changeToneTextClass(changeToneFromDelta(association.difference, outcomeChangeDirection(association.outcomeId)))}`}',
);

// Regression tests: auth boundary/session configuration and semantic direction.
write(
  "src/lib/__tests__/oauth-return.test.ts",
  `import { describe, expect, it } from "bun:test";
import { oauthReturnUrlForLocation, PRODUCTION_APP_ORIGIN, safeOAuthRedirectUrl } from "../../integrations/auth/account";

describe("BIXBO OAuth return origin", () => {
  it("keeps local and Lovable preview origins out of the production OAuth boundary", () => {
    expect(oauthReturnUrlForLocation("localhost", "http://localhost:3000")).toBe(PRODUCTION_APP_ORIGIN);
    expect(oauthReturnUrlForLocation("127.0.0.1", "http://127.0.0.1:3000")).toBe(PRODUCTION_APP_ORIGIN);
    expect(oauthReturnUrlForLocation("bixbo.lovable.app", "https://bixbo.lovable.app")).toBe(PRODUCTION_APP_ORIGIN);
    expect(oauthReturnUrlForLocation("preview-123.lovable.app", "https://preview-123.lovable.app")).toBe(PRODUCTION_APP_ORIGIN);
  });

  it("keeps the deployed production origin", () => {
    expect(oauthReturnUrlForLocation("bixbo.z8drwn9rpn.workers.dev", PRODUCTION_APP_ORIGIN)).toBe(PRODUCTION_APP_ORIGIN);
  });

  it("rejects a foreign OAuth redirect origin", () => {
    expect(safeOAuthRedirectUrl("https://evil.example/auth?next=/profile")).toBe(PRODUCTION_APP_ORIGIN + "/auth");
  });
});
`,
);

write(
  "src/lib/__tests__/pattern-change-semantics.test.ts",
  `import { describe, expect, it } from "bun:test";
import { changeToneFromDelta, outcomeChangeDirection } from "../patternChangeSemantics";

describe("Patterns semantic change tones", () => {
  it("marks symptom reductions green and symptom increases red", () => {
    expect(changeToneFromDelta(-2, "higher-worse")).toBe("good");
    expect(changeToneFromDelta(2, "higher-worse")).toBe("bad");
  });

  it("marks beneficial metric increases green and decreases red", () => {
    expect(changeToneFromDelta(12, "higher-better")).toBe("good");
    expect(changeToneFromDelta(-12, "higher-better")).toBe("bad");
  });

  it("keeps directionally ambiguous metrics neutral", () => {
    expect(changeToneFromDelta(3, "neutral")).toBe("neutral");
    expect(changeToneFromDelta(-3, "neutral")).toBe("neutral");
    expect(outcomeChangeDirection("admin-threshold:pain:custom")).toBe("neutral");
  });

  it("treats built-in trigger outcomes as adverse outcomes", () => {
    expect(outcomeChangeDirection("panic")).toBe("higher-worse");
    expect(outcomeChangeDirection("histamineFlare")).toBe("higher-worse");
    expect(changeToneFromDelta(15, outcomeChangeDirection("panic"))).toBe("bad");
    expect(changeToneFromDelta(-15, outcomeChangeDirection("panic"))).toBe("good");
  });
});
`,
);

// Active auth surfaces must be Google-only after this migration.
for (const path of [
  "src/routes/auth.tsx",
  "src/integrations/auth/account.ts",
  "src/features/profile/useProfilePageModel.tsx",
  "src/features/profile/ProfilePageSpecialViews.tsx",
]) {
  const source = read(path);
  if (/startOAuth\("apple"\)|startAccountOAuth\("apple"\)|Continue with Apple|provider:\s*"apple"|"google"\s*\|\s*"apple"/i.test(source)) {
    throw new Error(`${path}: Apple auth reference remains`);
  }
}

console.log("Applied Google auth/session stability and semantic Patterns colours.");
