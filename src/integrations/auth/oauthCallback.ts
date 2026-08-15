export type OAuthCallbackSearch = {
  oauthError?: string;
  oauthErrorCode?: string;
  oauthErrorDescription?: string;
};

export function safeOAuthSearchText(value: unknown): string {
  if (typeof value !== "string") return "";
  const clean = [...value]
    .map((char) => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127 ? " " : char;
    })
    .join("")
    .trim();
  return clean.slice(0, 500);
}

export function oauthCallbackErrorMessage(
  search: OAuthCallbackSearch,
  translate: (key: string) => string = (key) => key,
): string | null {
  const { oauthError, oauthErrorCode, oauthErrorDescription } = search;
  const combined = `${oauthError ?? ""} ${oauthErrorCode ?? ""} ${oauthErrorDescription ?? ""}`.toLowerCase();
  if (!combined.trim()) return null;

  if (combined.includes("invalid_client") || combined.includes("client secret") || combined.includes("exchange external code")) {
    return translate("Google sign-in is temporarily unavailable because its OAuth client configuration was rejected. Please try again after the Google sign-in configuration is corrected.");
  }

  return oauthErrorDescription || oauthError || translate("Google sign-in did not complete. Please try again.");
}
