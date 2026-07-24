import { ok } from "@/infrastructure/http";
import { hasGeminiKey, getGeminiApiKeys, defaultGeminiModelId } from "@/infrastructure/ai/gemini-client";

/**
 * Public health check for AI wiring.
 * Never returns the API key — only whether the server can reach Gemini mode.
 */
export async function GET() {
  const keys = getGeminiApiKeys();
  const configured = hasGeminiKey();
  return ok({
    geminiConfigured: configured,
    mode: configured ? "gemini" : "heuristic",
    model: configured ? defaultGeminiModelId() : null,
    apiKeyCount: keys.length,
    hint: configured
      ? keys.length > 1
        ? `${keys.length} Gemini keys configured (rotation on rate limits).`
        : "Chat intake uses server-side Gemini via GOOGLE_GENERATIVE_AI_API_KEY."
      : "Set GOOGLE_GENERATIVE_AI_API_KEY on Vercel (Production + Preview) and redeploy.",
    rateLimitHint:
      "429 errors mean the Google project free-tier quota is exhausted. A new key on the same project will not help — enable billing or wait for quota reset.",
  });
}
