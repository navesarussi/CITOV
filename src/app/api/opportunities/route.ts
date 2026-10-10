import { ok, fail } from "@/infrastructure/http";
import { authorizeActor } from "@/infrastructure/auth-guard";
import { jobCardForMatch } from "@/domain/job-for-match";
import { readOpportunityStore } from "@/infrastructure/store";

export async function GET(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) return ok({ error: "חסר userId" }, { status: 400 });
    const gate = await authorizeActor(userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const store = await readOpportunityStore(userId);
    const approved = store.matches.filter(
      (m) => m.candidateId === userId && m.status === "approved",
    );
    const jobs = approved.map((m) => {
      const er = store.employers.find((e) => e.userId === m.jobOwnerId);
      const user = store.users.find((u) => u.id === m.jobOwnerId);
      const card = jobCardForMatch(er, m.jobId);
      const whyHe =
        m.scoreBreakdown?.candidateReasonsHe ??
        m.reason.split(" · ").slice(0, 3);
      return {
        matchId: m.id,
        score: m.score,
        reason: m.reason,
        whyHe,
        employerName: user?.name ?? "מעסיק/ה",
        candidateConsentAt: m.candidateConsentAt ?? null,
        card,
      };
    });
    return ok({ jobs });
  } catch (e) {
    return fail(e);
  }
}
