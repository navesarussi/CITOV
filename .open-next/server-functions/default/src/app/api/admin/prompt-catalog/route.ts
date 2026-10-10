import {
  getPromptCatalogDetail,
  listPromptCatalog,
  rollbackCatalogPrompt,
  runPromptEval,
  saveCatalogPrompt,
} from "@/application/admin-prompt-catalog";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { ok, fail } from "@/infrastructure/http";
import { readStore } from "@/infrastructure/store";

export async function GET(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const id = new URL(req.url).searchParams.get("id");
    if (id) {
      const detail = await getPromptCatalogDetail(id);
      if (!detail) return ok({ error: "פרומפט לא נמצא" }, { status: 404 });
      return ok({ detail });
    }
    const catalog = await listPromptCatalog();
    return ok({ catalog });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const body = (await req.json()) as {
      action?: "save" | "rollback" | "eval";
      promptKey?: string;
      text?: string;
      version?: number;
    };
    const action = body.action ?? "save";
    const store = await readStore();

    if (action === "eval") {
      if (!body.promptKey) return ok({ error: "חסר מזהה פרומפט" }, { status: 400 });
      const summary = runPromptEval(body.promptKey);
      return ok({ ok: true, eval: summary });
    }

    if (action === "rollback") {
      if (!body.promptKey || body.version == null) {
        return ok({ error: "נדרשים מזהה וגרסה" }, { status: 400 });
      }
      const row = await rollbackCatalogPrompt({
        promptKey: body.promptKey,
        version: body.version,
        rolledBackBy: gate.email,
        adminSettings: store.adminSettings,
      });
      if (!row) return ok({ error: "גרסה לא נמצאה" }, { status: 404 });
      const detail = await getPromptCatalogDetail(body.promptKey);
      return ok({ ok: true, detail });
    }

    if (!body.promptKey?.trim() || !body.text?.trim()) {
      return ok({ error: "טקסט הפרומפט נדרש" }, { status: 400 });
    }
    await saveCatalogPrompt({
      promptKey: body.promptKey,
      body: body.text,
      createdBy: gate.email,
      adminSettings: store.adminSettings,
    });
    const detail = await getPromptCatalogDetail(body.promptKey);
    return ok({ ok: true, detail });
  } catch (e) {
    return fail(e);
  }
}
