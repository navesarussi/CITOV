import { getAdminDashboard, updateAdminPrompts } from "@/application/admin";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore, writeStore } from "@/infrastructure/store";

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

    const store = await readStore();
    const next = updateAdminPrompts(store, {
      candidatePrompt: body.candidatePrompt,
      employerPrompt: body.employerPrompt,
      updatedBy: gate.email,
    });
    await writeStore(next);
    return ok({ ok: true, updatedAt: next.adminSettings?.updatedAt });
  } catch (e) {
    return fail(e);
  }
}
