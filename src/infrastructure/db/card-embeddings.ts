import { createHash } from "crypto";
import type { EmbeddingSegment } from "@/domain/card-embedding-text";
import {
  candidateEmbeddingTexts,
  jobEmbeddingTexts,
  segmentTextsFingerprint,
} from "@/domain/card-embedding-text";
import type { CandidateCard, JobCard } from "@/domain/types";
import type { SegmentVectors } from "@/domain/semantic-matching";
import {
  DEFAULT_EMBEDDING_MODEL,
  embedSegmentTexts,
  type EmbeddingGeneratorKind,
} from "@/infrastructure/ai/embeddings";
import { shouldUseMemoryStore } from "./memory-store";
import {
  readMemorySegmentVectors,
  writeMemorySegmentVectors,
} from "./card-embeddings-memory";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";

export function hashEmbeddingContent(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function vectorToPg(v: number[]): string {
  return `[${v.join(",")}]`;
}

function pgRowToVector(raw: unknown): number[] {
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === "string") {
    return raw
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  return [];
}

export async function readSegmentVectors(
  ownerKind: "candidate" | "job",
  ownerId: string,
  jobSlotId?: string,
  model = DEFAULT_EMBEDDING_MODEL,
): Promise<SegmentVectors | null> {
  if (shouldUseMemoryStore()) {
    return readMemorySegmentVectors(ownerKind, ownerId, jobSlotId);
  }
  await ensureSchema();
  const pool = await getPool();
  const res = await pool.query<{ segment: EmbeddingSegment; embedding: unknown }>(
    `select segment, embedding::text as embedding
     from card_embedding_segments
     where owner_kind = $1 and owner_id = $2
       and coalesce(job_slot_id, '') = coalesce($3, '')
       and model = $4`,
    [ownerKind, ownerId, jobSlotId ?? null, model],
  );
  if (!res.rows.length) return null;
  const out: SegmentVectors = {};
  for (const row of res.rows) {
    out[row.segment] = pgRowToVector(row.embedding);
  }
  return out;
}

async function upsertSegments(
  ownerKind: "candidate" | "job",
  ownerId: string,
  jobSlotId: string | undefined,
  model: string,
  segments: Record<EmbeddingSegment, { hash: string; text: string; vector: number[] }>,
): Promise<void> {
  if (shouldUseMemoryStore()) {
    const vectors: SegmentVectors = {
      role: segments.role.vector,
      skills: segments.skills.vector,
      profile: segments.profile.vector,
    };
    const hash = hashEmbeddingContent(segmentTextsFingerprint({
      role: segments.role.text,
      skills: segments.skills.text,
      profile: segments.profile.text,
    }));
    writeMemorySegmentVectors(ownerKind, ownerId, jobSlotId, model, hash, vectors);
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  for (const seg of ["role", "skills", "profile"] as const) {
    const row = segments[seg];
    const slotKey = jobSlotId ?? "";
    const id = `${ownerKind}:${ownerId}:${slotKey}:${seg}:${model}`;
    await pool.query(
      `insert into card_embedding_segments
        (id, owner_kind, owner_id, job_slot_id, segment, model, content_hash, embedded_text, embedding, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector, now())
       on conflict (owner_kind, owner_id, job_slot_id, segment, model)
       do update set content_hash = excluded.content_hash,
         embedded_text = excluded.embedded_text,
         embedding = excluded.embedding,
         updated_at = now()`,
      [
        id,
        ownerKind,
        ownerId,
        slotKey || null,
        seg,
        model,
        row.hash,
        row.text,
        vectorToPg(row.vector),
      ],
    );
  }
}

export async function refreshCandidateEmbeddings(
  userId: string,
  card: CandidateCard,
  opts?: { generator?: EmbeddingGeneratorKind; model?: string },
): Promise<{ updated: boolean; generator: string }> {
  const texts = candidateEmbeddingTexts(card);
  const model = opts?.model ?? DEFAULT_EMBEDDING_MODEL;
  const currentHashes = await loadSegmentHashes("candidate", userId, undefined, model);
  if (
    currentHashes.role === hashEmbeddingContent(texts.role) &&
    currentHashes.skills === hashEmbeddingContent(texts.skills) &&
    currentHashes.profile === hashEmbeddingContent(texts.profile)
  ) {
    return { updated: false, generator: "cached" };
  }
  const vectors = await embedSegmentTexts(texts, {
    modelId: model,
    generator: opts?.generator,
  });
  await upsertSegments("candidate", userId, undefined, model, {
    role: { hash: hashEmbeddingContent(texts.role), text: texts.role, vector: vectors.role },
    skills: { hash: hashEmbeddingContent(texts.skills), text: texts.skills, vector: vectors.skills },
    profile: {
      hash: hashEmbeddingContent(texts.profile),
      text: texts.profile,
      vector: vectors.profile,
    },
  });
  return {
    updated: true,
    generator: opts?.generator ?? (process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "gemini" : "pseudo-local-v1"),
  };
}

export async function refreshJobEmbeddings(
  employerId: string,
  jobSlotId: string,
  card: JobCard,
  opts?: { generator?: EmbeddingGeneratorKind; model?: string },
): Promise<{ updated: boolean; generator: string }> {
  const texts = jobEmbeddingTexts(card);
  const model = opts?.model ?? DEFAULT_EMBEDDING_MODEL;
  const currentHashes = await loadSegmentHashes("job", employerId, jobSlotId, model);
  if (
    currentHashes.role === hashEmbeddingContent(texts.role) &&
    currentHashes.skills === hashEmbeddingContent(texts.skills) &&
    currentHashes.profile === hashEmbeddingContent(texts.profile)
  ) {
    return { updated: false, generator: "cached" };
  }
  const vectors = await embedSegmentTexts(texts, {
    modelId: model,
    generator: opts?.generator,
  });
  await upsertSegments("job", employerId, jobSlotId, model, {
    role: { hash: hashEmbeddingContent(texts.role), text: texts.role, vector: vectors.role },
    skills: { hash: hashEmbeddingContent(texts.skills), text: texts.skills, vector: vectors.skills },
    profile: {
      hash: hashEmbeddingContent(texts.profile),
      text: texts.profile,
      vector: vectors.profile,
    },
  });
  return {
    updated: true,
    generator: opts?.generator ?? (process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "gemini" : "pseudo-local-v1"),
  };
}

async function loadSegmentHashes(
  ownerKind: "candidate" | "job",
  ownerId: string,
  jobSlotId: string | undefined,
  model: string,
): Promise<Partial<Record<EmbeddingSegment, string>>> {
  if (shouldUseMemoryStore()) return {};
  await ensureSchema();
  const pool = await getPool();
  const res = await pool.query<{ segment: EmbeddingSegment; content_hash: string }>(
    `select segment, content_hash from card_embedding_segments
     where owner_kind = $1 and owner_id = $2
       and coalesce(job_slot_id, '') = coalesce($3, '')
       and model = $4`,
    [ownerKind, ownerId, jobSlotId ?? null, model],
  );
  const out: Partial<Record<EmbeddingSegment, string>> = {};
  for (const row of res.rows) out[row.segment] = row.content_hash;
  return out;
}

export async function loadMatchingEmbeddingIndex(store: {
  employees: { userId: string }[];
  employers: { userId: string; jobs: { id: string }[] }[];
}): Promise<{
  candidate: Map<string, SegmentVectors>;
  job: Map<string, SegmentVectors>;
}> {
  const candidate = new Map<string, SegmentVectors>();
  const job = new Map<string, SegmentVectors>();
  for (const e of store.employees) {
    const v = await readSegmentVectors("candidate", e.userId);
    if (v) candidate.set(e.userId, v);
  }
  for (const emp of store.employers) {
    for (const slot of emp.jobs) {
      const v = await readSegmentVectors("job", emp.userId, slot.id);
      if (v) job.set(slot.id, v);
    }
  }
  return { candidate, job };
}
