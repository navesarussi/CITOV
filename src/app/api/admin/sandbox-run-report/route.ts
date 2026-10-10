import type { SandboxRunReport } from "@/application/test-sandbox/run-report";
import { runSandboxSeedAndReport } from "@/application/test-sandbox/pipeline";
import {
  runSandboxLlmJudgeChunk,
  SANDBOX_JUDGE_BATCH_SIZE,
} from "@/application/test-sandbox/llm-judge-run";
import { mergeEvalFixtureIntoIndex } from "@/application/eval-embedding-index";
import { loadMatchingEmbeddingIndex } from "@/infrastructure/db/card-embeddings";
import { assertAdmin } from "@/infrastructure/admin-guard";
import { latestSandboxRunReport } from "@/infrastructure/db/app-events";
import { filterStoreByScope } from "@/infrastructure/db/store-scope";
import { readNormalizedStore } from "@/infrastructure/db/normalized-store";
import { ok, fail } from "@/infrastructure/http";

export const maxDuration = 300;
export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    const raw = await latestSandboxRunReport();
    if (!raw) return ok({ report: null });
    return ok({ report: raw as SandboxRunReport & { recordedAt?: string } });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const gate = await assertAdmin();
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });
    if (!process.env.DATABASE_URL?.trim()) {
      return ok({ error: "DATABASE_URL לא מוגדר בשרת" }, { status: 503 });
    }

    let body: { action?: "seed" | "judgeChunk"; offset?: number; reset?: boolean } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      body = { action: "seed" };
    }

    if (body.action === "judgeChunk") {
      const raw = await readNormalizedStore();
      const store = filterStoreByScope(raw, "test");
      const index = mergeEvalFixtureIntoIndex(await loadMatchingEmbeddingIndex(store));
      const offset = Number(body.offset ?? 0);
      const progress = await runSandboxLlmJudgeChunk({
        store,
        index,
        offset,
        limit: SANDBOX_JUDGE_BATCH_SIZE,
        reset: body.reset ?? offset === 0,
      });
      return ok({ judge: progress });
    }

    const report = await runSandboxSeedAndReport();
    return ok({ report, next: { action: "judgeChunk", offset: 0, reset: true } });
  } catch (e) {
    return fail(e);
  }
}
