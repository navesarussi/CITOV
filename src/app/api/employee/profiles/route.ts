import { ok, fail } from "@/infrastructure/http";
import { assertActor } from "@/infrastructure/auth-guard";
import { persistEmployeeProfile } from "@/infrastructure/db/scoped-store";
import {
  ensureProfilePack,
  listCandidateProfiles,
  persistActiveProfile,
  replaceEmployee,
  switchActiveProfile,
} from "@/domain/candidate-profiles";
import { firstNameFromFullName } from "@/domain/person-name";

function profileSummaries(emp: ReturnType<typeof ensureProfilePack>) {
  return listCandidateProfiles(emp).map((p) => ({
    id: p.id,
    label: p.label,
    kind: p.kind,
  }));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      action?: "select";
      profileId?: string;
    };
    if (!body.userId) return ok({ error: "חסר userId" }, { status: 400 });
    const gate = await assertActor(body.userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const store = gate.store;
    const user = store.users.find((u) => u.id === body.userId);
    const raw = store.employees.find((e) => e.userId === body.userId);
    if (!raw || !user) return ok({ error: "מועמד לא נמצא" }, { status: 404 });

    const accountLabel = firstNameFromFullName(user.name ?? "") ?? "אני";
    let emp = ensureProfilePack(raw, accountLabel);

    if (body.action === "select") {
      if (!body.profileId) return ok({ error: "חסר profileId" }, { status: 400 });
      emp = switchActiveProfile(persistActiveProfile(emp), body.profileId);
    } else {
      return ok({ error: "פעולה לא נתמכת" }, { status: 400 });
    }

    const next = {
      ...store,
      employees: replaceEmployee(store.employees, emp),
    };

    await persistEmployeeProfile({
      store: next,
      userId: body.userId,
      card: emp.card,
      pendingFieldQuestionIds: emp.pendingFieldQuestionIds,
      cv: emp.cv,
    });

    const pack = emp.cv?.profilePack;
    return ok({
      profiles: profileSummaries(emp),
      activeProfileId: pack?.activeProfileId ?? "self",
      card: emp.card,
      chat: emp.chat,
    });
  } catch (e) {
    return fail(e);
  }
}
