import { candidateCardViewLines } from "@/domain/candidate-card-views";
import { CANDIDATE_FIELD_META, JOB_FIELD_META } from "@/domain/card-fields";
import { formatCardValue } from "@/domain/card-extras";
import type { CompanyCard } from "@/domain/company-card";
import type { CandidateCard, JobCard } from "@/domain/types";

const CANDIDATE_LABELS = Object.fromEntries(
  CANDIDATE_FIELD_META.map((m) => [m.key, m.label]),
) as Record<string, string>;

function jobFieldValue(job: JobCard, key: string): string {
  return formatCardValue((job as Record<string, unknown>)[key]);
}

export function labelingJobRows(job: JobCard): { label: string; value: string }[] {
  return JOB_FIELD_META.map((m) => ({ label: m.label, value: jobFieldValue(job, m.key) }));
}

export function labelingCandidateRows(
  candidate: CandidateCard,
): { label: string; value: string }[] {
  return candidateCardViewLines(candidate, "full", CANDIDATE_LABELS).map((l) => ({
    label: l.label,
    value: l.value,
  }));
}

export function labelingCompanyRows(company: CompanyCard): { label: string; value: string }[] {
  return [
    { label: "חברה", value: company.name },
    { label: "תעשייה", value: company.industry },
    { label: "גודל", value: company.size },
    { label: "מיקום", value: company.headquarters },
    { label: "תרבות", value: company.culture },
    { label: "ערכים", value: company.values },
    { label: "סביבת עבודה", value: company.workEnvironment },
    { label: "הטבות", value: company.benefitsSummary },
    { label: "אתר", value: company.website },
    { label: "תקציר", value: company.summary },
    { label: "סיפור", value: company.narrative },
  ];
}
