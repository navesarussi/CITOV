import { buildArchitectureLiveStats } from "@/application/admin-architecture-live";
import {
  AI_SAFETY_SECTIONS,
  ARCHITECTURE_FLOWS,
  ARCHITECTURE_NODES,
  ENGINEERING_DILEMMAS,
} from "@/domain/admin-architecture-content";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const live = await buildArchitectureLiveStats();
    return ok({
      nodes: ARCHITECTURE_NODES,
      flows: ARCHITECTURE_FLOWS,
      safety: AI_SAFETY_SECTIONS,
      dilemmas: ENGINEERING_DILEMMAS,
      live,
    });
  } catch (e) {
    return fail(e);
  }
}
