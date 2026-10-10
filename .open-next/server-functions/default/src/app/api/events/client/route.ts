import { recordAppEventSafe } from "@/infrastructure/db/app-events";
import { ok } from "@/infrastructure/http";
import {
  jsonBodyTooLargeResponse,
  readMaxJsonBodyBytes,
  trimMessageTooLong,
} from "@/infrastructure/request-limits";
import { checkUserRateLimitAsync } from "@/infrastructure/user-rate-limit";

const MAX_CLIENT_EVENT_CHARS = 2_000;

export async function POST(req: Request) {
  try {
    const tooLarge = jsonBodyTooLargeResponse(req, readMaxJsonBodyBytes("default"));
    if (tooLarge) return tooLarge;

    const body = (await req.json()) as {
      message?: string;
      stack?: string;
      url?: string;
      userId?: string;
      kind?: "client_error" | "user_feedback";
    };
    const msgCheck = trimMessageTooLong(body.message ?? "", MAX_CLIENT_EVENT_CHARS);
    if (!msgCheck.ok) {
      return ok({ error: "message too long" }, { status: 413 });
    }

    const rateKey = body.userId?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    const rl = await checkUserRateLimitAsync(rateKey, {
      bucket: "client_events",
      limit: Number(process.env.CLIENT_EVENTS_RATE_LIMIT ?? 20),
      windowMs: Number(process.env.CLIENT_EVENTS_RATE_WINDOW_MS ?? 60_000),
    });
    if (!rl.allowed) {
      return ok({ error: "rate limited" }, { status: 429 });
    }

    const kind = body.kind === "user_feedback" ? "user_feedback" : "client_error";
    recordAppEventSafe({
      kind,
      severity: "warn",
      route: body.url ?? null,
      message: msgCheck.message,
      stack: body.stack?.slice(0, 4000),
      userId: body.userId ?? null,
    });
    return ok({ ok: true });
  } catch (e) {
    return ok({ ok: false }, { status: 400 });
  }
}
