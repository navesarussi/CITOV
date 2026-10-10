import { rebuildMatches } from "@/application/rebuild-matches";
import { TEST_SANDBOX_DATASET_ID } from "@/domain/test-sandbox";
import type { Match, StoreData } from "@/domain/types";
import { randomUUID } from "crypto";
import type { MatchEmbeddingIndex } from "../match-scoring";

export function runSandboxMatching(
  store: StoreData,
  embeddingIndex?: MatchEmbeddingIndex,
): { store: StoreData; stats: ReturnType<typeof rebuildMatches>["stats"] } {
  const scoped: StoreData = {
    ...store,
    users: store.users.filter((u) => u.isTest),
    employees: store.employees.filter((e) => e.userId.startsWith("sandbox-")),
    employers: store.employers.filter((e) => e.userId.startsWith("sandbox-")),
    matches: store.matches.filter((m) => !m.isTest),
  };
  const { matches, stats } = rebuildMatches(scoped, embeddingIndex, { sandboxOnly: true });
  const tagged: Match[] = matches.map((m) => ({
    ...m,
    isTest: true,
    datasetId: TEST_SANDBOX_DATASET_ID,
    id: m.id || randomUUID(),
  }));
  return {
    store: { ...scoped, matches: tagged },
    stats,
  };
}
