import type { CandidateCard, FieldAnswer, FieldQuestion } from "./types";

export function unansweredQuestionsForCandidate(
  candidate: CandidateCard,
  questions: FieldQuestion[],
  answers: FieldAnswer[],
  candidateId: string,
): FieldQuestion[] {
  if (!candidate.field) return [];
  const field = candidate.field.trim().toLowerCase();
  const answered = new Set(
    answers.filter((a) => a.candidateId === candidateId).map((a) => a.questionId),
  );
  return questions.filter(
    (q) => q.field.trim().toLowerCase() === field && !answered.has(q.id),
  );
}

export function mergeAnswerIntoCard(
  card: CandidateCard,
  question: FieldQuestion,
  answer: string,
): CandidateCard {
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
