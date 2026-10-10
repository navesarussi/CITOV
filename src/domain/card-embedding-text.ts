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

/**
 * Build embeddable text per segment. Salary, location, and must-haves stay out of
 * vectors — they remain in rule-based filters/penalties.
 */
export function candidateEmbeddingTexts(card: CandidateCard): EmbeddingSegmentTexts {
  return {
    role: joinParts([card.desiredRole, card.field, card.subField, card.experienceLevel]),
    skills: joinParts(
      [
        joinList(card.skills),
        joinList(card.softSkills),
        card.licenses,
        card.certifications,
        card.computerSkills,
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
  return {
    role: joinParts([card.title, card.field, card.subField, card.seniorityLevel]),
    skills: joinParts(
      [
        joinList(card.mustHaves),
        joinList(card.niceToHaves),
        card.toolsRequired,
        card.requiredLicenses,
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
