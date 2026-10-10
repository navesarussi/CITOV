import { assertAdmin } from "@/infrastructure/admin-guard";
import { setEmployerVerified } from "@/infrastructure/db/normalized-store";
import { ok, fail } from "@/infrastructure/http";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const { id } = await ctx.params;
    const body = (await req.json()) as { verified?: boolean };
    if (typeof body.verified !== "boolean") {
      return ok({ error: "verified חייב boolean" }, { status: 400 });
    }
    await setEmployerVerified(id, body.verified);
    return ok({ ok: true, userId: id, verified: body.verified });
  } catch (e) {
    return fail(e);
  }
}
