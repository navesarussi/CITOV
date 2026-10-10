import { candidateForMatching, jobForMatching } from "./match-canonical";
import type { CandidateCard, JobCard } from "./types";

/** Which slice of a card is embedded (see docs/EMBEDDINGS.md). */
export type EmbeddingSegment = "role" | "skills" | "profile";

export type EmbeddingSegmentTexts = Record<EmbeddingSegment, string>;

function joinParts(parts: (string | undefined | null)[], sep = " · "): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(sep);
}

function joinList(items: string[] | undefined): string {
  return (items ?? []).map((s) => s.trim()).filter(Boolean).join(", ");
}

export function isSegmentNonempty(text: string | undefined): boolean {
  return Boolean(text?.trim());
}

/**
 * Build embeddable text per segment. Salary, location, and must-haves stay out of
 * vectors — they remain in rule-based filters/penalties.
 */
export function candidateEmbeddingTexts(card: CandidateCard): EmbeddingSegmentTexts {
  const c = candidateForMatching(card);
  return {
    role: joinParts([c.desiredRole, c.field, c.subField, c.experienceLevel]),
    skills: joinParts(
      [
        joinList(c.skills),
        joinList(c.softSkills),
        c.licenses,
        c.certifications,
        c.computerSkills,
      ],
      " | ",
    ),
    profile: joinParts([
      card.summary,
      card.narrative,
      card.personality,
      card.workStyle,
      card.strengths,
      card.careerGoals,
    ]),
  };
}

export function jobEmbeddingTexts(card: JobCard): EmbeddingSegmentTexts {
  const j = jobForMatching(card);
  return {
    role: joinParts([j.title, j.field, j.subField, j.seniorityLevel]),
    skills: joinParts(
      [
        joinList(j.mustHaves),
        joinList(j.niceToHaves),
        j.toolsRequired,
        j.requiredLicenses,
      ],
      " | ",
    ),
    profile: joinParts([
      card.summary,
      card.narrative,
      card.personalityFit,
      card.teamCulture,
      card.companyDescription,
      card.successMetrics,
    ]),
  };
}

export function segmentTextsFingerprint(texts: EmbeddingSegmentTexts): string {
  return (["role", "skills", "profile"] as const)
    .map((k) => `${k}=${texts[k]}`)
    .join("\n");
}

/** Segments with no meaningful text are not embedded or compared. */
export function activeEmbeddingSegments(
  texts: EmbeddingSegmentTexts,
): EmbeddingSegment[] {
  return (["role", "skills", "profile"] as const).filter((s) =>
    isSegmentNonempty(texts[s]),
  );
}
