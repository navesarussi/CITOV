import { ok } from "@/infrastructure/http";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { hasGeminiKey, getGeminiApiKeys, defaultGeminiModelId } from "@/infrastructure/ai/gemini-client";

/** Public: `{ ok }`. Admin `?detail=1`: Gemini wiring (no secrets). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const detail = url.searchParams.get("detail") === "1";
  const configured = hasGeminiKey();
  if (!detail) {
    return ok({ ok: configured });
  }
  const gate = await assertAdmin();
  if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
  const keys = getGeminiApiKeys();
  return ok({
    ok: configured,
    geminiConfigured: configured,
    mode: configured ? "gemini" : "heuristic",
    model: configured ? defaultGeminiModelId() : null,
    apiKeyCount: keys.length,
  });
}
