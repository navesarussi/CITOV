import { inferMatchCanonicalFromText, mergeMatchCanonical } from "@/domain/match-canonical";
import {
  hebrewDisplayCandidateCard,
  hebrewDisplayJobCard,
} from "@/domain/hebrew-display";
import type { CandidateCard, JobCard } from "@/domain/types";

/** Demo/prod seed cards: Hebrew display, English canonical tokens for rules. Eval JSON stays unchanged. */
export function hebrewDemoJobCard(card: JobCard): JobCard {
  const inferred = inferMatchCanonicalFromText(card);
  return mergeMatchCanonical(hebrewDisplayJobCard(card), inferred);
}

export function hebrewDemoCandidateCard(card: CandidateCard): CandidateCard {
  const inferred = inferMatchCanonicalFromText({
    desiredRole: card.desiredRole,
    field: card.field,
    skills: card.skills,
    languages: card.languages,
    location: card.location,
  });
  return mergeMatchCanonical(hebrewDisplayCandidateCard(card), inferred);
}
