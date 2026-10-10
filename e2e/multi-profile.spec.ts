import { test, expect } from "@playwright/test";
import {
  bootstrapE2e,
  createE2eSession,
  fetchMe,
  reportE2e,
  syncE2eAuth,
  writeStoredUser,
} from "./helpers";

test.describe("E2E prod flows", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_SECRET, "E2E_SECRET not configured");
  });

  test("candidate multi-profile persistence", async ({ page, request }) => {
    const user = await createE2eSession(request, "employee", "E2E מנהל פרופילים");
    const boot = (await bootstrapE2e(request, user.id, "multi_profile")) as {
      profiles?: { id: string; chatMarker?: string }[];
    };
    expect(boot.profiles?.length).toBeGreaterThanOrEqual(3);

    await syncE2eAuth(page, request, { ...user, role: "employee" });
    await page.goto("/employee");
    await expect(page.getByText(/צ'אט|chat/i).first()).toBeVisible({ timeout: 30_000 });

    const me1 = await fetchMe(request, user.id);
    const profiles = me1.candidateProfiles as { id: string; label: string }[];
    expect(profiles.length).toBeGreaterThanOrEqual(3);

    for (const marker of ["E2E-PROFILE-SELF", "E2E-PROFILE-OTHER-1", "E2E-PROFILE-OTHER-2"]) {
      const slot = boot.profiles!.find((p) => p.chatMarker === marker);
      expect(slot, marker).toBeTruthy();
      const select = await request.post("/api/employee/profiles", {
        headers: { "Content-Type": "application/json" },
        data: { userId: user.id, action: "select", profileId: slot!.id },
      });
      expect(select.ok()).toBeTruthy();
      const body = (await select.json()) as { chat?: { content: string }[] };
      const texts = (body.chat ?? []).map((m) => m.content).join("\n");
      expect(texts).toContain(marker);
    }

    await page.evaluate(() => localStorage.removeItem("shidukh_user"));
    await writeStoredUser(page, { ...user, role: "employee" });
    await page.reload();
    await expect(page.getByText(/צ'אט|chat/i).first()).toBeVisible({ timeout: 30_000 });

    const meAfter = await fetchMe(request, user.id);
    const chats = JSON.stringify(meAfter.chat);
    expect(chats).toContain("E2E-PROFILE-SELF");

    await reportE2e(request, {
      ok: true,
      suite: "multi-profile-candidate",
      userId: user.id,
      profileCount: profiles.length,
      summary: "Multi-profile chat markers persisted after reload",
    });
  });

  test("employer multi-job and matches list", async ({ page, request }) => {
    const user = await createE2eSession(request, "employer", "E2E חברה");
    const boot = (await bootstrapE2e(request, user.id, "employer_jobs")) as {
      jobs?: { id: string; name: string }[];
    };
    expect(boot.jobs?.length).toBeGreaterThanOrEqual(3);

    await syncE2eAuth(page, request, { ...user, role: "employer" });
    await page.goto("/employer");
    await expect(page.getByText(/צ'אט|משרות|candidates/i).first()).toBeVisible({
      timeout: 30_000,
    });

    for (const job of boot.jobs!) {
      const me = await fetchMe(request, user.id, job.id);
      const chat = (me.chat as { content: string }[]) ?? [];
      expect(chat.some((m) => m.content.includes(job.name))).toBeTruthy();
    }

    const candRes = await request.get(`/api/candidates?userId=${encodeURIComponent(user.id)}`);
    expect(candRes.ok()).toBeTruthy();

    await reportE2e(request, {
      ok: true,
      suite: "employer-multi-job",
      employerId: user.id,
      jobCount: boot.jobs?.length,
      summary: "Employer jobs and chat persisted; candidates API reachable",
    });
  });
});
