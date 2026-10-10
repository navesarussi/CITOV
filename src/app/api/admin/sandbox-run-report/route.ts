import type { SandboxRunReport } from "@/application/test-sandbox/run-report";
import { runSandboxSeedAndReport } from "@/application/test-sandbox/pipeline";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { latestSandboxRunReport } from "@/infrastructure/db/app-events";
import { ok, fail } from "@/infrastructure/http";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const raw = await latestSandboxRunReport();
    if (!raw) return ok({ report: null });
    return ok({ report: raw as SandboxRunReport & { recordedAt?: string } });
  } catch (e) {
    return fail(e);
  }
}

export async function POST() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    if (!process.env.DATABASE_URL?.trim()) {
      return ok({ error: "DATABASE_URL לא מוגדר בשרת" }, { status: 503 });
    }
    const report = await runSandboxSeedAndReport();
    return ok({ report });
  } catch (e) {
    return fail(e);
  }
}
