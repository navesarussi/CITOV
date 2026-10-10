import { test, expect } from "@playwright/test";
import { createE2eSession, reportE2e } from "./helpers";

test.describe("Identity reveal (mutual approval)", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_SECRET, "E2E_SECRET not configured");
  });

  test("employer CV access only after candidate consent", async ({ request }) => {
    const candidate = await createE2eSession(request, "employee", "E2E חשיפת זהות");
    const employer = await createE2eSession(request, "employer", "E2E מעסיק חשיפה");

    const res = await request.post("/api/e2e/reveal-flow", {
      headers: {
        "x-e2e-secret": process.env.E2E_SECRET!,
        "Content-Type": "application/json",
      },
      data: { candidateId: candidate.id, employerId: employer.id },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      canViewBefore?: boolean;
      canViewAfter?: boolean;
      consented?: boolean;
    };
    expect(body.canViewBefore).toBe(false);
    expect(body.consented).toBe(true);
    expect(body.canViewAfter).toBe(true);

    await reportE2e(request, {
      ok: true,
      suite: "identity-reveal",
      candidateId: candidate.id,
      employerId: employer.id,
      summary: "CV gate closed until candidate consent",
    });
  });
});
