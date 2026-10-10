import { ok, fail } from "@/infrastructure/http";
import { authorizeActor } from "@/infrastructure/auth-guard";
import {
  anonymizedMatchReason,
  projectCandidateCardAnonymized,
} from "@/domain/employer-candidate-privacy";
import { readCandidateQueueStore } from "@/infrastructure/store";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const jobId = url.searchParams.get("jobId");
    if (!userId) return ok({ error: "חסר userId" }, { status: 400 });
    const gate = await authorizeActor(userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const store = await readCandidateQueueStore(userId, jobId);
    const matches = store.matches
      .filter((m) => {
        if (m.jobOwnerId !== userId || m.status !== "queued") return false;
        if (!jobId) return true;
        return (m.jobId || m.jobOwnerId) === jobId;
      })
      .sort((a, b) => b.score - a.score);
    const candidates = matches.map((m, index) => {
      const emp = store.employees.find((e) => e.userId === m.candidateId);
      return {
        matchId: m.id,
        jobId: m.jobId || m.jobOwnerId,
        score: m.score,
        reason: anonymizedMatchReason(),
        name: `מועמד/ת #${index + 1}`,
        card: emp?.card ? projectCandidateCardAnonymized(emp.card) : undefined,
      };
    });
    return ok({ candidates });
  } catch (e) {
    return fail(e);
  }
}
