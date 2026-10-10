import {
  candidateCardViewLines,
  type CardViewLine,
} from "@/domain/candidate-card-views";
import type { CandidateCard } from "@/domain/types";

export type MiniCardLine = CardViewLine;

/** Safe subset for the candidate's own mini preview (not admin/recruiter cards). */
export function candidateMiniCardLines(
  card: CandidateCard,
  labels: Record<string, string>,
): MiniCardLine[] {
  return candidateCardViewLines(card, "candidate", labels);
}

export function employeeHasCv(cv?: { documents?: unknown[] }): boolean {
  return (cv?.documents?.length ?? 0) > 0;
}
