/** Soft-disable Google only when explicitly GOOGLE_AUTH_ENABLED=false. */
export function isGoogleAuthEnabled(): boolean {
  if (process.env.GOOGLE_AUTH_ENABLED === "false") return false;
  if (hasGoogleCredentials() && Boolean(process.env.AUTH_SECRET?.trim())) return true;
  return process.env.GOOGLE_AUTH_ENABLED === "true";
}

/** Test login at `/demo` — explicit true/false wins; else off in production, on in local/dev. */
export function isTestLoginEnabled(): boolean {
  if (process.env.ALLOW_TEST_LOGIN === "true") return true;
  if (process.env.ALLOW_TEST_LOGIN === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function hasGoogleCredentials(): boolean {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim(),
  );
}

/** UI + session: Google when enabled and credentials exist. */
export function hasGoogleAuth(): boolean {
  return isGoogleAuthEnabled() && hasGoogleCredentials();
}

export function allowDemoMode(): boolean {
  return process.env.ALLOW_DEMO === "true";
}

/** Open local sessions only in local dev when neither Google nor test login is active. */
export function allowOpenAuth(): boolean {
  if (isGoogleAuthEnabled()) return false;
  if (isTestLoginEnabled()) return false;
  return process.env.NODE_ENV === "development";
}
