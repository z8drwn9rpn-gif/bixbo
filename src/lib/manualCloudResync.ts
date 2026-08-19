import { supabase } from "@/integrations/supabase/client";
import { fetchPartner, pullMyData, pushMyData } from "./cloudSync";
import { mergeBixbo } from "./merge";
import {
  getBixbo,
  hasAuthoritativeLocalSnapshot,
  replaceBixbo,
  setPartner,
} from "./storage";

export type ManualCloudResyncResult = {
  localChanged: boolean;
  partnerFound: boolean;
};

function privateSnapshot(data: ReturnType<typeof getBixbo>): string {
  return JSON.stringify({ ...data, partner: undefined });
}

async function recoverSessionIfPossible() {
  const {
    data: { session: currentSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw sessionError;
  if (currentSession) return currentSession;

  // iOS PWAs can resume after the access token has aged while the refresh token
  // is still persisted. Give Supabase one explicit recovery attempt before we
  // tell the user to sign in again.
  const {
    data: { session: refreshedSession },
  } = await supabase.auth.refreshSession();

  return refreshedSession;
}

/**
 * User-invoked, authoritative resync. Unlike a browser reload, this actually
 * reconciles the private diary, writes the merged snapshot back to both cloud
 * projections, and refreshes the linked partner view before resolving.
 */
export async function resyncAppFromCloud(): Promise<ManualCloudResyncResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("You are offline. Reconnect and try Resync app again.");
  }

  const session = await recoverSessionIfPossible();
  if (!session?.user) {
    throw new Error("Sign in again to resync BIXBO with the cloud.");
  }

  const hadLocalSnapshot = hasAuthoritativeLocalSnapshot();
  const localBefore = getBixbo();
  const remote = await pullMyData();
  let reconciled = localBefore;

  if (remote) {
    const merged = mergeBixbo(localBefore, remote, {
      legacyLocalCanonical: hadLocalSnapshot,
    });
    reconciled = { ...merged, partner: localBefore.partner };
  }

  const localChanged = privateSnapshot(reconciled) !== privateSnapshot(localBefore);
  if (localChanged) replaceBixbo(reconciled, "remote");

  // Always push the reconciled snapshot. This is intentional for a manual
  // resync: it repairs partner_shared_data even when private user_data already
  // happened to match the local copy.
  await pushMyData(reconciled);

  const partner = await fetchPartner();
  setPartner(partner ?? undefined);

  return {
    localChanged,
    partnerFound: Boolean(partner),
  };
}
