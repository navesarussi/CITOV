import { overlap, textScore } from "./matching";
import type { CandidateCard, JobCard } from "./types";

export type LabelFieldRow = {
  key: string;
  label: string;
  jobValue: string;
  candidateValue: string;
  align: "match" | "partial" | "conflict" | "neutral";
};

function fmt(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  if (typeof v === "number") return String(v);
  return String(v).trim();
}

function alignPair(jobVal: string, candVal: string, skillsMode = false): LabelFieldRow["align"] {
  if (!jobVal && !candVal) return "neutral";
  if (!jobVal || !candVal) return "neutral";
  if (skillsMode) {
    const o = overlap(
      jobVal.split(/,\s*/),
      candVal.split(/,\s*/),
    );
    if (o >= 0.5) return "match";
    if (o > 0) return "partial";
    return "conflict";
  }
  const s = textScore(jobVal, candVal);
  if (s >= 0.55) return "match";
  if (s >= 0.25) return "partial";
  return "conflict";
}

export function jobCandidateFieldRows(job: JobCard, candidate: CandidateCard): LabelFieldRow[] {
  const rows: { key: string; label: string; j: unknown; c: unknown; skills?: boolean }[] = [
    { key: "title", label: "תפקיד", j: job.title, c: candidate.desiredRole },
    { key: "field", label: "תחום", j: job.field, c: candidate.field },
    { key: "location", label: "מיקום", j: job.location, c: candidate.location },
    { key: "salary", label: "שכר", j: job.salaryRange || job.salaryMin, c: candidate.salaryExpectation || candidate.salaryMin },
    { key: "seniority", label: "ותק", j: job.seniorityLevel, c: candidate.experienceLevel },
    { key: "experience", label: "שנות ניסיון", j: job.minExperienceYears, c: candidate.experienceYears },
    { key: "mustHaves", label: "דרישות חובה", j: job.mustHaves, c: candidate.skills, skills: true },
    { key: "niceToHaves", label: "יתרון", j: job.niceToHaves, c: candidate.softSkills, skills: true },
    { key: "languages", label: "שפות", j: job.requiredLanguages, c: candidate.languages, skills: true },
    { key: "shifts", label: "משמרות", j: job.shiftPattern, c: candidate.shiftPreference },
    { key: "personality", label: "אופי / התאמה", j: job.personalityFit, c: candidate.personality },
    { key: "culture", label: "תרבות / סגנון", j: job.teamCulture, c: candidate.workStyle },
    { key: "physical", label: "דרישות פיזיות", j: job.physicalDemands, c: candidate.physicalRequirementsOk },
    { key: "dealBreakers", label: "קווים אדומים", j: job.dealBreakers, c: candidate.dealBreakers },
    { key: "flex", label: "גמישות (1–10)", j: job.flexibility, c: candidate.flexibility },
    { key: "narrative", label: "סיפור / הקשר", j: job.narrative, c: candidate.narrative },
  ];
  return rows.map((r) => {
    const jobValue = fmt(r.j);
    const candidateValue = fmt(r.c);
    return {
      key: r.key,
      label: r.label,
      jobValue,
      candidateValue,
      align: alignPair(jobValue, candidateValue, r.skills),
    };
  });
}
