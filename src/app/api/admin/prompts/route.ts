import {
  defaultPromptSnapshot,
  getAdminDashboard,
  resetAdminPrompts,
  updateAdminPrompts,
} from "@/application/admin";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore, updateStore } from "@/infrastructure/store";

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const store = await readStore();
    const { prompts } = getAdminDashboard(store);
    return ok({ prompts });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const body = (await req.json()) as {
      candidatePrompt?: string;
      employerPrompt?: string;
    };
    if (!body.candidatePrompt?.trim() || !body.employerPrompt?.trim()) {
      return ok({ error: "שני הפרומפטים נדרשים" }, { status: 400 });
    }

    // Atomic-ish merge so concurrent chat writes don't drop prompt saves.
    const next = await updateStore((store) =>
      updateAdminPrompts(store, {
        candidatePrompt: body.candidatePrompt!,
        employerPrompt: body.employerPrompt!,
        updatedBy: gate.email,
      }),
    );
    return ok({
      ok: true,
      updatedAt: next.adminSettings?.updatedAt,
      isCustom: true,
    });
  } catch (e) {
    return fail(e);
  }
}

/** Reset to file defaults — live from prompts/*.md again. */
export async function DELETE() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    await updateStore((store) => resetAdminPrompts(store));
    const defaults = defaultPromptSnapshot();
    return ok({ ok: true, prompts: defaults, isCustom: false });
  } catch (e) {
    return fail(e);
  }
}
