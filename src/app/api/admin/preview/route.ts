import { assertAdmin } from "@/infrastructure/admin-guard";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

export async function GET(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const url = new URL(req.url);
    const role = url.searchParams.get("role") === "employer" ? "employer" : "employee";
    const userId = url.searchParams.get("userId");
    const store = await readStore();
    if (role === "employee") {
      const emp = userId
        ? store.employees.find((e) => e.userId === userId)
        : store.employees.find((e) => !e.userId.startsWith("seed-")) ?? store.employees[0];
      if (!emp) return ok({ error: "אין מועמדים" }, { status: 404 });
      const user = store.users.find((u) => u.id === emp.userId);
      return ok({
        role: "employee",
        userId: emp.userId,
        name: user?.name ?? emp.userId,
        card: emp.card,
        chat: emp.chat,
      });
    }
    const raw = userId
      ? store.employers.find((e) => e.userId === userId)
      : store.employers[0];
    if (!raw) return ok({ error: "אין מעסיקים" }, { status: 404 });
    const er = normalizeEmployerRecord(raw);
    const user = store.users.find((u) => u.id === er.userId);
    return ok({
      role: "employer",
      userId: er.userId,
      name: user?.name ?? er.userId,
      card: er.card,
      chat: er.chat,
      jobs: er.jobs.map((j) => ({ id: j.id, name: j.name, title: j.card.title })),
      activeJobId: er.activeJobId,
      company: (raw as { company?: unknown }).company,
    });
  } catch (e) {
    return fail(e);
  }
}
