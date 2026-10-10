import { backfillMatchCanonicalOnStore } from "@/application/match-canonical-backfill";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { refreshCandidateEmbeddings, refreshJobEmbeddings } from "@/infrastructure/db/card-embeddings";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import { readNormalizedStore, writeNormalizedStore } from "@/infrastructure/db/normalized-store";
import { rebuildAndWriteMatches } from "@/infrastructure/store";
import { ok, fail } from "@/infrastructure/http";

export async function POST() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const current = await readNormalizedStore();
    const next = backfillMatchCanonicalOnStore(current);
    process.env.ALLOW_FULL_STORE_WRITE = "1";
    await writeNormalizedStore(next);
    for (const emp of next.employees) {
      await refreshCandidateEmbeddings(emp.userId, emp.card);
    }
    for (const raw of next.employers) {
      const er = normalizeEmployerRecord(raw);
      for (const job of er.jobs) {
        await refreshJobEmbeddings(er.userId, job.id, job.card);
      }
    }
    await rebuildAndWriteMatches();
    return ok({
      ok: true,
      employees: next.employees.length,
      employers: next.employers.length,
    });
  } catch (e) {
    return fail(e);
  }
}
