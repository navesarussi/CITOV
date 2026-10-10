import { deleteUserAccountData } from "@/application/delete-user-data";
import { assertActor } from "@/infrastructure/auth-guard";
import { ok, fail } from "@/infrastructure/http";
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { userId?: string; confirm?: boolean };
    if (!body.userId || body.confirm !== true) {
      return ok({ error: "נדרש אישור מחיקה" }, { status: 400 });
    }
    const gate = await assertActor(body.userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    await deleteUserAccountData(body.userId);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
