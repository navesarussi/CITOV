import { canonicalizeFieldToken } from "./match-canonical";
import {
  applyDomainAnswerToCard,
  builtinDomainQuestions,
  detectWorkDomain,
} from "./work-domain";
import type { CandidateCard, FieldAnswer, FieldQuestion } from "./types";

function fieldMatchesQuestion(candidate: CandidateCard, q: FieldQuestion): boolean {
  const domain = detectWorkDomain(candidate);
  const qField = q.field.trim().toLowerCase();
  if (q.sourceEmployerId === "system") return q.id.startsWith("domain:");
  const candField = candidate.field.trim().toLowerCase();
  if (candField === qField) return true;
  return canonicalizeFieldToken(candidate.field) === qField;
}

export function unansweredQuestionsForCandidate(
  candidate: CandidateCard,
  questions: FieldQuestion[],
  answers: FieldAnswer[],
  candidateId: string,
): FieldQuestion[] {
  if (!candidate.field) return builtinDomainQuestions(candidate);
  const answered = new Set(
    answers.filter((a) => a.candidateId === candidateId).map((a) => a.questionId),
  );
  const employerQs = questions.filter(
    (q) => fieldMatchesQuestion(candidate, q) && !answered.has(q.id),
  );
  const domainQs = builtinDomainQuestions(candidate).filter((q) => !answered.has(q.id));
  const seen = new Set<string>();
  return [...domainQs, ...employerQs].filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}

export function mergeAnswerIntoCard(
  card: CandidateCard,
  question: FieldQuestion,
  answer: string,
): CandidateCard {
  if (question.id.startsWith("domain:")) {
    return applyDomainAnswerToCard(card, question.id, answer);
  }
  return {
    ...card,
    extras: {
      ...card.extras,
      [question.question]: answer,
    },
  };
}

export function normalizeField(field: string): string {
  return field.trim().toLowerCase();
}
