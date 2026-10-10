import { randomUUID } from "crypto";
import { canViewCandidateCv } from "@/domain/cv-access";
import { assertActor } from "@/infrastructure/auth-guard";
import { isE2eAuthEnabled } from "@/infrastructure/e2e-auth";
import { ensureSchema } from "@/infrastructure/db/schema";
import { getPool } from "@/infrastructure/db/pool";
import { updateMatchCandidateConsent } from "@/infrastructure/db/scoped-store";
import { setEmployerVerified } from "@/infrastructure/db/normalized-store";
import { ok } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

function authorized(req: Request): boolean {
  return req.headers.get("x-e2e-secret") === process.env.E2E_SECRET?.trim();
}

export async function POST(req: Request) {
  if (!isE2eAuthEnabled() || !authorized(req)) {
    return ok({ error: "E2E auth disabled" }, { status: 403 });
  }
  const body = (await req.json()) as {
    candidateId?: string;
    employerId?: string;
  };
  const candidateId = body.candidateId?.trim();
  const employerId = body.employerId?.trim();
  if (!candidateId?.startsWith("e2e-") || !employerId?.startsWith("e2e-")) {
    return ok({ error: "invalid e2e ids" }, { status: 400 });
  }
  const gate = await assertActor(candidateId);
  if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

  await setEmployerVerified(employerId, true);
  const jobId = employerId;
  const matchId = `pair__${jobId}__${candidateId}`;
  const now = new Date().toISOString();

  await ensureSchema();
  const pool = await getPool();
  await pool.query(
    `insert into matches (
       id, job_owner_id, job_id, candidate_id, score, reason, status,
       candidate_consent_at, is_test, created_at, updated_at
     ) values ($1,$2,$3,$4,$5,$6,'approved',null,false,$7,$7)
     on conflict (id) do update set
       status = 'approved',
       candidate_consent_at = null,
       updated_at = excluded.updated_at`,
    [matchId, employerId, jobId, candidateId, 0.9, "e2e reveal flow", now],
  );

  const storeBefore = await readStore();
  const canViewBefore = canViewCandidateCv(
    storeBefore,
    { userId: employerId, isAdmin: false },
    candidateId,
  );

  const consented = await updateMatchCandidateConsent({ matchId, candidateId });
  const storeAfter = await readStore();
  const canViewAfter = canViewCandidateCv(
    storeAfter,
    { userId: employerId, isAdmin: false },
    candidateId,
  );

  return ok({
    ok: true,
    matchId,
    consented,
    canViewBefore,
    canViewAfter,
    traceId: randomUUID(),
  });
}
