import { candidatePatchSchema, jobPatchSchema } from "@/infrastructure/ai/schemas";

const CANDIDATE_KEYS = new Set(Object.keys(candidatePatchSchema.shape));
const JOB_KEYS = new Set(Object.keys(jobPatchSchema.shape));

export function filterCandidatePatchKeys(
  patch: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!patch) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (!CANDIDATE_KEYS.has(key)) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

export function filterJobPatchKeys(
  patch: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!patch) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (!JOB_KEYS.has(key)) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}
