import { nextCrowdLabelPair, type CrowdLabelInput } from "@/application/crowd-labeling";
import type { RelevanceLabel } from "@/domain/matching-eval/types";
import { authorizeActor } from "@/infrastructure/auth-guard";
import { upsertMatchLabel } from "@/infrastructure/db/match-labels";
import { ok, fail } from "@/infrastructure/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId")?.trim();
    if (!userId) return ok({ error: "חסר userId" }, { status: 400 });
    const gate = await authorizeActor(userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const pair = await nextCrowdLabelPair(userId);
    return ok({ pair });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CrowdLabelInput & { userId?: string };
    if (!body.userId || !body.jobId || !body.candidateId || !body.label) {
      return ok({ error: "חסרים שדות" }, { status: 400 });
    }
    const gate = await authorizeActor(body.userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const label = body.label as RelevanceLabel;
    await upsertMatchLabel({
      jobId: body.jobId,
      candidateId: body.candidateId,
      label,
      note: body.note,
      source: "crowd",
      labelerUserId: body.userId,
      labelerRole: gate.user.role,
    });
    const pair = await nextCrowdLabelPair(body.userId);
    return ok({ ok: true, pair });
  } catch (e) {
    return fail(e);
  }
}
