import { runDemoSeed } from "@/application/demo-seed";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";

export async function POST(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const body = (await req.json().catch(() => ({}))) as { force?: boolean };
    const result = await runDemoSeed({ force: Boolean(body.force) });
    return ok({ ok: true, ...result });
  } catch (e) {
    return fail(e);
  }
}
