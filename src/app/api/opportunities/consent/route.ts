import { ok, fail } from "@/infrastructure/http";
import { authorizeActor } from "@/infrastructure/auth-guard";
import { updateMatchCandidateConsent } from "@/infrastructure/db/scoped-store";
import { readStore } from "@/infrastructure/store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { userId?: string; matchId?: string };
    const userId = body.userId?.trim();
    const matchId = body.matchId?.trim();
    if (!userId || !matchId) {
      return ok({ error: "חסר userId או matchId" }, { status: 400 });
    }
    const gate = await authorizeActor(userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const store = await readStore();
    const match = store.matches.find((m) => m.id === matchId && m.candidateId === userId);
    if (!match) return ok({ error: "התאמה לא נמצאה" }, { status: 404 });
    if (match.status !== "approved") {
      return ok({ error: "ניתן לאשר חשיפה רק לאחר שהמעסיק/ה אישר/ה את ההתאמה" }, { status: 409 });
    }
    if (match.candidateConsentAt) return ok({ ok: true, alreadyConsented: true });

    const updated = await updateMatchCandidateConsent({ matchId, candidateId: userId });
    if (!updated) return ok({ error: "לא ניתן לעדכן" }, { status: 409 });
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
