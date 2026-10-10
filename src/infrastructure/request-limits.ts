import { ok } from "@/infrastructure/http";

export function readMaxChatMessageChars(): number {
  const n = Number(process.env.MAX_CHAT_MESSAGE_CHARS ?? 8_000);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 8_000;
}

export function readMaxJsonBodyBytes(route: "chat" | "cv-analyze" | "default"): number {
  const envKey =
    route === "chat"
      ? process.env.MAX_CHAT_JSON_BYTES
      : route === "cv-analyze"
        ? process.env.MAX_CV_ANALYZE_JSON_BYTES
        : process.env.MAX_API_JSON_BYTES;
  const fallback =
    route === "chat" ? 256 * 1024 : route === "cv-analyze" ? 64 * 1024 : 512 * 1024;
  const n = Number(envKey ?? fallback);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Reject oversized bodies when Content-Length is present (before buffering JSON). */
export function jsonBodyTooLargeResponse(
  req: Request,
  maxBytes: number,
): Response | null {
  const raw = req.headers.get("content-length");
  if (!raw) return null;
  const len = Number(raw);
  if (!Number.isFinite(len) || len <= maxBytes) return null;
  return ok({ error: "גוף הבקשה גדול מדי" }, { status: 413 });
}

export function trimMessageTooLong(
  message: string,
  maxChars: number,
): { ok: true; message: string } | { ok: false; error: string } {
  const trimmed = message.trim();
  if (trimmed.length <= maxChars) return { ok: true, message: trimmed };
  return {
    ok: false,
    error: `הודעה ארוכה מדי (מקסימום ${maxChars.toLocaleString("he-IL")} תווים)`,
  };
}
