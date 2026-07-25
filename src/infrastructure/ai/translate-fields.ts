import { generateObject } from "ai";
import { z } from "zod";
import { callGeminiWithRetry, getGeminiModel, hasGeminiKey } from "./gemini-client";

const mapSchema = z.object({
  fields: z.record(z.string(), z.string()),
});

/** Translate a flat map of display strings into the target language. */
export async function translateFieldMap(params: {
  fields: Record<string, string>;
  targetLocale: "he" | "en";
}): Promise<Record<string, string>> {
  const entries = Object.entries(params.fields).filter(([, v]) => v.trim().length > 0);
  if (entries.length === 0 || !hasGeminiKey()) return params.fields;

  const language = params.targetLocale === "he" ? "Hebrew" : "English";
  try {
    const { object } = await callGeminiWithRetry(() =>
      generateObject({
        model: getGeminiModel(),
        schema: mapSchema,
        prompt: `Translate each value into natural ${language} for a job-seeker profile UI.
Keep meaning. Do not add new facts. Preserve proper nouns when commonly left untranslated.
Return JSON object "fields" with the SAME keys.

Input:
${JSON.stringify(Object.fromEntries(entries), null, 2)}`,
      }),
    );
    return { ...params.fields, ...object.fields };
  } catch {
    return params.fields;
  }
}
