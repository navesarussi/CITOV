import {
  ensureAdminSandboxProfiles,
  resetAdminSandboxEmployee,
  resetAdminSandboxEmployer,
} from "@/application/admin-sandbox";
import {
  ADMIN_SANDBOX_EMPLOYEE_ID,
  ADMIN_SANDBOX_EMPLOYER_ID,
} from "@/domain/admin-sandbox";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore, writeStore } from "@/infrastructure/store";

export async function GET(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const url = new URL(req.url);
    const role = url.searchParams.get("role") === "employer" ? "employer" : "employee";
    let store = await readStore();
    store = ensureAdminSandboxProfiles(store);
    await writeStore(store);

    if (role === "employee") {
      const emp = store.employees.find((e) => e.userId === ADMIN_SANDBOX_EMPLOYEE_ID)!;
      return ok({
        role: "employee",
        userId: emp.userId,
        sandbox: true,
        card: emp.card,
        chat: emp.chat,
        hasCv: (emp.cv?.documents?.length ?? 0) > 0,
      });
    }
    const raw = store.employers.find((e) => e.userId === ADMIN_SANDBOX_EMPLOYER_ID)!;
    const er = normalizeEmployerRecord(raw);
    return ok({
      role: "employer",
      userId: er.userId,
      sandbox: true,
      card: er.card,
      chat: er.chat,
      activeJobId: er.activeJobId,
      jobs: er.jobs.map((j) => ({
        id: j.id,
        title: j.card.title?.trim() || j.name || "משרה",
      })),
      company: (raw as { company?: unknown }).company,
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const body = (await req.json()) as { action?: "reset"; role?: "employee" | "employer" };
    if (body.action !== "reset") {
      return ok({ error: "פעולה לא נתמכת" }, { status: 400 });
    }
    let store = await readStore();
    store =
      body.role === "employer"
        ? resetAdminSandboxEmployer(store)
        : resetAdminSandboxEmployee(store);
    await writeStore(store);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
