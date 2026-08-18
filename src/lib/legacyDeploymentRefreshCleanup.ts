const ISSUE_KEY = "bixbo:runtime-diagnostics:v1";
const DEPLOYMENT_REFRESH_PARAM = "__bixbo_deploy_refresh";
const DEPLOYMENT_RELOAD_GUARD_KEY = "bixbo:deployment-reload-guard:v2";

type StoredIssue = {
  kind?: unknown;
  message?: unknown;
  path?: unknown;
  [key: string]: unknown;
};

function cleanLegacyForcedRefreshIssue(issue: StoredIssue): boolean {
  const kind = String(issue.kind ?? "");
  const message = String(issue.message ?? "");
  const path = String(issue.path ?? "");

  return kind === "jank"
    && /^App open-to-paint latency was about \d+ ms\.$/i.test(message)
    && path.includes(`${DEPLOYMENT_REFRESH_PARAM}=`);
}

function cleanupLegacyDeploymentRefreshArtifacts(): void {
  if (typeof window === "undefined") return;

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(ISSUE_KEY) ?? "[]");
    if (Array.isArray(parsed)) {
      const next = parsed.filter((raw) => {
        if (!raw || typeof raw !== "object") return true;
        return !cleanLegacyForcedRefreshIssue(raw as StoredIssue);
      });
      if (next.length !== parsed.length) {
        window.localStorage.setItem(ISSUE_KEY, JSON.stringify(next));
      }
    }
  } catch {
    // Diagnostic cleanup is best-effort only.
  }

  try {
    window.sessionStorage.removeItem(DEPLOYMENT_RELOAD_GUARD_KEY);
  } catch {
    // Restricted storage must not affect app startup.
  }

  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(DEPLOYMENT_REFRESH_PARAM)) {
      url.searchParams.delete(DEPLOYMENT_REFRESH_PARAM);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // URL cleanup is cosmetic and must never affect startup.
  }
}

cleanupLegacyDeploymentRefreshArtifacts();

export { cleanupLegacyDeploymentRefreshArtifacts };
