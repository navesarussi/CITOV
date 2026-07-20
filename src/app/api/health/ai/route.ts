import { ok } from "@/infrastructure/http";
import { hasGeminiKey } from "@/infrastructure/ai/schemas";

/**
 * Public health check for AI wiring.
 * Never returns the API key — only whether the server can reach Gemini mode.
 */
export async function GET() {
  const configured = hasGeminiKey();
  return ok({
    geminiConfigured: configured,
    mode: configured ? "gemini" : "heuristic",
    model: configured ? "gemini-2.5-flash" : null,
    hint: configured
      ? "Chat intake uses server-side Gemini via GOOGLE_GENERATIVE_AI_API_KEY."
      : "Set GOOGLE_GENERATIVE_AI_API_KEY on Vercel (Production + Preview) and redeploy.",
  });
}
