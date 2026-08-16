export type LegalControllerDetails = {
  name: string;
  address: string;
  email: string;
  complete: boolean;
};

/** Public controller details are build-time configuration, never a secret. */
export function legalControllerDetails(): LegalControllerDetails {
  const configuredName = String(import.meta.env.VITE_LEGAL_CONTROLLER_NAME ?? "").trim();
  const address = String(import.meta.env.VITE_LEGAL_CONTROLLER_ADDRESS ?? "").trim();
  const email = String(import.meta.env.VITE_LEGAL_PRIVACY_EMAIL ?? "").trim();
  return {
    name: configuredName || "BIXBO operator",
    address,
    email,
    complete: Boolean(configuredName && address && email),
  };
}
