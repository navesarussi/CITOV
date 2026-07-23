import { randomUUID } from "crypto";
import { applyCvExtraction } from "@/application/chat";
import { createAiUsageRecord } from "@/domain/admin";
import type { CandidateDocument, StoreData } from "@/domain/types";
import { runCvExtraction } from "@/infrastructure/ai/intake";
import { assertActor } from "@/infrastructure/auth-guard";
import { saveCandidateDocumentBlob } from "@/infrastructure/files/cv-storage";
import { extractTextFromUpload, MAX_UPLOAD_BYTES } from "@/infrastructure/files/extract-text";
import { ok, fail } from "@/infrastructure/http";
import { writeStore } from "@/infrastructure/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const userId = String(form.get("userId") ?? "").trim();
    const file = form.get("file");
    if (!userId || !(file instanceof File)) {
      return ok({ error: "חסר קובץ או משתמש" }, { status: 400 });
    }

    const gate = await assertActor(userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return ok({ error: "הקובץ גדול מדי (עד 5MB)" }, { status: 400 });
    }

    const text = await extractTextFromUpload(buffer, file.name, file.type);
    if (text.length < 10) {
      return ok({ error: "לא נמצא טקסט קריא בקובץ" }, { status: 400 });
    }

    const store = gate.store;
    const emp = store.employees.find((e) => e.userId === userId);
    if (!emp) return ok({ error: "משתמש לא נמצא" }, { status: 404 });

    const docId = randomUUID();
    const storageKey = await saveCandidateDocumentBlob({
      id: docId,
      userId,
      content: buffer,
    });

    const extracted = await runCvExtraction({ text, card: emp.card });
    const document: CandidateDocument = {
      id: docId,
      kind: "cv",
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      byteSize: buffer.length,
      storageKey,
      uploadedAt: new Date().toISOString(),
      textCharCount: text.length,
      extractedText: text,
      extractionStatus: extracted.provider === "heuristic" ? "partial" : "ok",
    };

    const applied = applyCvExtraction(
      store,
      userId,
      {
        patch: extracted.patch,
        workHistory: extracted.workHistory,
        educationHistory: extracted.educationHistory,
        unmappedFacts: extracted.unmappedFacts,
        fieldConfidence: extracted.fieldConfidence,
      },
      document,
    );

    let next: StoreData = applied.store;
    if (extracted.usage) {
      next = {
        ...next,
        aiUsage: [
          ...(next.aiUsage ?? []),
          createAiUsageRecord({
            id: randomUUID(),
            type: "cv_import",
            promptTokens: extracted.usage.promptTokens,
            completionTokens: extracted.usage.completionTokens,
            createdAt: new Date().toISOString(),
          }),
        ].slice(-200),
      };
    }

    await writeStore(next);
    return ok({
      ok: true,
      provider: extracted.provider,
      summary: applied.summary,
      documentId: docId,
    });
  } catch (e) {
    return fail(e);
  }
}
