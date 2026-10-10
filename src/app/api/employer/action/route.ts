import { askFieldQuestion } from "@/application/employer-actions";
import { ok, fail } from "@/infrastructure/http";
import { assertActor } from "@/infrastructure/auth-guard";
import { persistFieldQuestionDelta } from "@/infrastructure/db/normalized-store";
import { readMatchingStore } from "@/infrastructure/store";
import { updateMatchStatus } from "@/infrastructure/db/scoped-store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      employerId?: string;
      matchId?: string;
      action?: "approve" | "reject" | "ask";
      question?: string;
    };
    if (!body.employerId || !body.matchId || !body.action) {
      return ok({ error: "חסרים פרטים" }, { status: 400 });
    }
    const gate = await assertActor(body.employerId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    if (body.action === "approve" || body.action === "reject") {
      const updated = await updateMatchStatus({
        matchId: body.matchId,
        employerId: body.employerId,
        status: body.action === "approve" ? "approved" : "rejected",
      });
      if (!updated) return ok({ error: "התאמה לא נמצאה" }, { status: 404 });
      return ok({ ok: true });
    }

    const store = await readMatchingStore();
    const next = askFieldQuestion(store, {
      employerId: body.employerId,
      matchId: body.matchId,
      question: body.question ?? "",
    });
    if (next.fieldQuestions.length === store.fieldQuestions.length) {
      return ok({ ok: true });
    }
    const question = next.fieldQuestions[next.fieldQuestions.length - 1]!;
    const employeePending = next.employees
      .filter((e) => {
        const prev = store.employees.find((p) => p.userId === e.userId);
        return (
          prev &&
          prev.pendingFieldQuestionIds.length !== e.pendingFieldQuestionIds.length
        );
      })
      .map((e) => ({
        userId: e.userId,
        pendingFieldQuestionIds: e.pendingFieldQuestionIds,
      }));
    await persistFieldQuestionDelta(question, employeePending);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
