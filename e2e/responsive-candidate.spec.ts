import { test, expect } from "@playwright/test";
import { createE2eSession, syncE2eAuth } from "./helpers";
import path from "path";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1920, height: 1080 },
] as const;

test.describe("Candidate workspace responsive layout", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_SECRET, "E2E_SECRET not configured");
  });

  for (const vp of VIEWPORTS) {
    test(`CV upload visible and chat fills height @ ${vp.width}px`, async ({ page, request }) => {
      const user = await createE2eSession(request, "employee", `E2E רספונסיבי ${vp.name}`);
      await syncE2eAuth(page, request, { ...user, role: "employee" });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/employee");
      await expect(page.getByText(/צ'אט|chat/i).first()).toBeVisible({ timeout: 30_000 });

      const dropzone = page.getByTestId("cv-upload-dropzone").first();
      await expect(dropzone).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("cv-upload-button").first()).toBeVisible();

      const chatSurface = page.locator(".chat-surface").first();
      const box = await chatSurface.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThan(vp.width <= 375 ? 220 : 280);

      const dir = await page.evaluate(() => document.documentElement.dir);
      expect(dir).toBe("rtl");

      await page.screenshot({
        path: path.join("e2e", "screenshots", `candidate-no-cv-${vp.name}-${vp.width}.png`),
        fullPage: false,
      });
    });
  }
});
