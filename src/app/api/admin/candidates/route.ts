import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

/** Admin-only: full candidate cards for inspection. */
export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const store = await readStore();
    const candidates = store.employees
      .map((emp) => {
        const user = store.users.find((u) => u.id === emp.userId);
        return {
          userId: emp.userId,
          name: user?.name ?? emp.userId,
          email: user?.email ?? null,
          card: emp.card,
          hasCv: (emp.cv?.documents?.length ?? 0) > 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "he"));

    return ok({ candidates });
  } catch (e) {
    return fail(e);
  }
}
