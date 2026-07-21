import { after } from "next/server";
import { applyFlexibility } from "@/application/update-flexibility";
import { refreshStoreMatches } from "@/application/employer-actions";
import type { CandidateCard, JobCard } from "@/domain/types";
import { ok, fail } from "@/infrastructure/http";
import { assertActor } from "@/infrastructure/auth-guard";
import { writeMatches } from "@/infrastructure/store";
import { persistEmployeeCard, persistEmployerCard } from "@/infrastructure/db/scoped-store";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { userId?: string; value?: number };
    if (!body.userId || body.value == null) {
      return ok({ error: "חסרים פרטים" }, { status: 400 });
    }
    if (!Number.isFinite(body.value) || body.value < 1 || body.value > 10) {
      return ok({ error: "גמישות חייבת להיות בין 1 ל-10" }, { status: 400 });
    }

    const gate = await assertActor(body.userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    // Set flexibility and persist only this user's profile row — no whole-store
    // rewrite and no synchronous match rebuild on the response path.
    const applied = applyFlexibility(gate.store, body.userId, body.value);
    if (applied.role === "employee") {
      const emp = applied.store.employees.find((e) => e.userId === body.userId);
      await persistEmployeeCard(
        body.userId,
        applied.card as CandidateCard,
        emp?.pendingFieldQuestionIds ?? [],
      );
    } else {
      await persistEmployerCard(
        body.userId,
        applied.card as JobCard,
        applied.jobs ?? [],
        applied.activeJobId ?? "",
      );
    }

    const refresh = async () => {
      try {
        await writeMatches(refreshStoreMatches(applied.store).matches);
      } catch (err) {
        console.error("deferred flexibility match refresh failed", err);
      }
    };
    try {
      after(refresh);
    } catch {
      await refresh();
    }

    return ok({ ok: true, flexibility: Math.round(body.value) });
  } catch (e) {
    return fail(e);
  }
}
