import { findCandidateDocument } from "@/domain/cv-access";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { readCandidateDocumentBlob } from "@/infrastructure/files/cv-storage";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const { id, documentId } = await ctx.params;
    const store = await readStore();
    const meta = findCandidateDocument(store, id, documentId);
    if (!meta) return ok({ error: "מסמך לא נמצא" }, { status: 404 });

    const bytes = await readCandidateDocumentBlob(meta.storageKey);
    if (!bytes) return ok({ error: "קובץ לא נמצא באחסון" }, { status: 404 });

    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": meta.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
