import { generateObject } from "ai";
import { z } from "zod";
import { renderPromptTemplate } from "@/domain/admin";
import { resolvePromptText } from "@/infrastructure/db/prompt-versions";
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

  try {
    const template = await resolvePromptText("card_display_translation");
    const prompt = renderPromptTemplate(template, {
      targetLocale: params.targetLocale,
      fields: JSON.stringify(Object.fromEntries(entries), null, 2),
    });
    const { object } = await callGeminiWithRetry(() =>
      generateObject({
        model: getGeminiModel(),
        schema: mapSchema,
        prompt,
      }),
    );
    return { ...params.fields, ...object.fields };
  } catch {
    return params.fields;
  }
}
