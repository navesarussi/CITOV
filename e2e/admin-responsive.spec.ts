import { test, expect } from "@playwright/test";
import path from "path";
import { syncE2eAdminAuth } from "./helpers";

const WIDTHS = [
  { name: "375", width: 375, height: 812 },
  { name: "414", width: 414, height: 896 },
] as const;

const ADMIN_ROUTES = [
  { slug: "dashboard", path: "/admin" },
  { slug: "architecture", path: "/admin/architecture" },
  { slug: "candidates", path: "/admin/candidates" },
  { slug: "employers", path: "/admin/employers" },
  { slug: "labeling", path: "/admin/labeling" },
  { slug: "sandbox-report", path: "/admin/sandbox-report" },
  { slug: "monitoring", path: "/admin/monitoring" },
  { slug: "preview-employee", path: "/admin/preview/employee" },
  { slug: "preview-employer", path: "/admin/preview/employer" },
  { slug: "guidelines", path: "/admin/guidelines" },
] as const;

test.describe("Admin portal mobile layout", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_SECRET, "E2E_SECRET not configured");
    test.skip(process.env.E2E_AUTH_ENABLED !== "true", "E2E_AUTH_ENABLED required for admin");
  });

  for (const vp of WIDTHS) {
    for (const route of ADMIN_ROUTES) {
      test(`${route.slug} @ ${vp.width}px — no horizontal overflow`, async ({ page, request }) => {
        await syncE2eAdminAuth(page, request);
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(route.path);
        await page.waitForTimeout(1500);

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth - doc.clientWidth;
        });
        expect(overflow).toBeLessThanOrEqual(2);

        const navBtn = page.getByRole("button", { name: /תפריט מנהל/i });
        await expect(navBtn).toBeVisible();

        await page.screenshot({
          path: path.join("e2e", "screenshots", `admin-${route.slug}-${vp.name}.png`),
          fullPage: true,
        });
      });
    }
  }
});
