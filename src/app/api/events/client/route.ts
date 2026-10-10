import { recordAppEventSafe } from "@/infrastructure/db/app-events";
import { ok } from "@/infrastructure/http";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      stack?: string;
      url?: string;
      userId?: string;
      kind?: "client_error" | "user_feedback";
    };
    if (!body.message?.trim()) {
      return ok({ error: "message required" }, { status: 400 });
    }
    const kind = body.kind === "user_feedback" ? "user_feedback" : "client_error";
    recordAppEventSafe({
      kind,
      severity: "warn",
      route: body.url ?? null,
      message: body.message,
      stack: body.stack,
      userId: body.userId ?? null,
    });
    return ok({ ok: true });
  } catch (e) {
    return ok({ ok: false }, { status: 400 });
  }
}
