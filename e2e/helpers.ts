import type { APIRequestContext, Page } from "@playwright/test";

const secretHeaders = () => ({
  "x-e2e-secret": e2eSecret(),
  "Content-Type": "application/json",
});

export function e2eSecret(): string {
  const s = process.env.E2E_SECRET?.trim();
  if (!s) throw new Error("E2E_SECRET is required");
  return s;
}

export async function createE2eSession(
  request: APIRequestContext,
  role: "employee" | "employer",
  label: string,
): Promise<{ id: string; name: string; role: string }> {
  const res = await request.post("/api/e2e/session", {
    headers: secretHeaders(),
    data: { role, label },
  });
  if (!res.ok()) throw new Error(`e2e session failed: ${res.status()}`);
  const data = (await res.json()) as { user?: { id: string; name: string; role: string } };
  if (!data.user) throw new Error("missing user");
  return data.user;
}

export async function bootstrapE2e(
  request: APIRequestContext,
  userId: string,
  scenario: "multi_profile" | "employer_jobs",
) {
  const res = await request.post("/api/e2e/bootstrap", {
    headers: secretHeaders(),
    data: { userId, scenario },
  });
  if (!res.ok()) throw new Error(`e2e bootstrap failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function syncE2eAuth(
  page: Page,
  request: APIRequestContext,
  user: { id: string; name: string; role: "employee" | "employer" },
) {
  await writeStoredUser(page, user);
  const state = await request.storageState();
  const cookies = state.cookies.map((c) => ({
    ...c,
    url: c.domain ? undefined : undefined,
  }));
  if (cookies.length) {
    await page.context().addCookies(
      state.cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
    );
  }
}

export async function fetchMe(
  request: APIRequestContext,
  userId: string,
  jobId?: string,
): Promise<Record<string, unknown>> {
  const q = jobId ? `&jobId=${encodeURIComponent(jobId)}` : "";
  const res = await request.get(`/api/me?userId=${encodeURIComponent(userId)}${q}`);
  if (!res.ok()) throw new Error(`me failed: ${res.status()}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function reportE2e(request: APIRequestContext, summary: Record<string, unknown>) {
  await request.post("/api/e2e/report", {
    headers: secretHeaders(),
    data: summary,
  });
}

/** Sets HttpOnly e2e admin cookie (requires E2E_AUTH_ENABLED on server). */
export async function syncE2eAdminAuth(page: Page, request: APIRequestContext) {
  const res = await request.post("/api/e2e/admin-session", { headers: secretHeaders() });
  if (!res.ok()) throw new Error(`e2e admin session failed: ${res.status()}`);
  const state = await request.storageState();
  if (state.cookies.length) {
    await page.context().addCookies(
      state.cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
    );
  }
}

export function writeStoredUser(
  page: Page,
  user: { id: string; name: string; role: "employee" | "employer" },
) {
  return page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    ["shidukh_user", JSON.stringify(user)],
  );
}
