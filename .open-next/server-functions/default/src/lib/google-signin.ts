import { getCsrfToken } from "next-auth/react";

const CSRF_TTL_MS = 4 * 60 * 1000;

let cachedCsrf: { token: string; at: number } | null = null;

/** Warm CSRF before the user clicks — cuts one RTT off Google sign-in. */
export async function prefetchGoogleSignInCsrf(): Promise<void> {
  try {
    const token = await getCsrfToken();
    if (token) cachedCsrf = { token, at: Date.now() };
  } catch {
    cachedCsrf = null;
  }
}

async function resolveCsrfToken(): Promise<string> {
  if (cachedCsrf && Date.now() - cachedCsrf.at < CSRF_TTL_MS) {
    return cachedCsrf.token;
  }
  const token = await getCsrfToken();
  cachedCsrf = token ? { token, at: Date.now() } : null;
  return token;
}

/**
 * Google OAuth without next-auth's getProviders() RTT.
 * Landing already knows Google is configured via session flags.
 */
export async function signInWithGoogleFast(options: {
  callbackUrl: string;
  prompt?: string;
}): Promise<void> {
  const callbackUrl = options.callbackUrl;
  const csrfToken = await resolveCsrfToken();
  const authParams = new URLSearchParams();
  if (options.prompt) authParams.set("prompt", options.prompt);

  const res = await fetch(`/api/auth/signin/google?${authParams}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl,
    }),
  });
  const data = (await res.json()) as { url?: string };
  const url = data.url ?? callbackUrl;
  window.location.href = url;
  if (url.includes("#")) window.location.reload();
}
