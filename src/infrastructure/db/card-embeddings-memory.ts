import type { EmbeddingSegment } from "@/domain/card-embedding-text";
import type { SegmentVectors } from "@/domain/semantic-matching";

type RowKey = string;

function key(ownerKind: "candidate" | "job", ownerId: string, jobSlotId?: string): RowKey {
  return `${ownerKind}:${ownerId}:${jobSlotId ?? ""}`;
}

const store = new Map<
  RowKey,
  { model: string; contentHash: string; vectors: SegmentVectors; updatedAt: string }
>();

export function readMemorySegmentVectors(
  ownerKind: "candidate" | "job",
  ownerId: string,
  jobSlotId?: string,
): SegmentVectors | null {
  return store.get(key(ownerKind, ownerId, jobSlotId))?.vectors ?? null;
}

export function writeMemorySegmentVectors(
  ownerKind: "candidate" | "job",
  ownerId: string,
  jobSlotId: string | undefined,
  model: string,
  contentHash: string,
  vectors: SegmentVectors,
): void {
  store.set(key(ownerKind, ownerId, jobSlotId), {
    model,
    contentHash,
    vectors,
    updatedAt: new Date().toISOString(),
  });
}

export function resetMemoryEmbeddings(): void {
  store.clear();
}
