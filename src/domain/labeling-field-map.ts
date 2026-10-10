import { overlap, textScore } from "./matching";
import {
  enrichCandidateForRuleMatch,
  enrichJobForRuleMatch,
  canonicalizeFieldToken,
  canonicalizeLanguageToken,
  canonicalizeLocationToken,
  canonicalizeRoleToken,
} from "./match-canonical";
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

function canonicalToken(token: string, mode: "role" | "location" | "field" | "language"): string {
  const t = token.trim();
  if (!t) return t;
  if (mode === "location") return canonicalizeLocationToken(t);
  if (mode === "field") return canonicalizeFieldToken(t);
  if (mode === "language") return canonicalizeLanguageToken(t);
  return canonicalizeRoleToken(t);
}

function canonicalList(values: string[], mode: "role" | "language"): string[] {
  return values.map((v) => canonicalToken(v, mode)).filter(Boolean);
}

function alignPair(
  jobVal: string,
  candVal: string,
  opts: { skills?: boolean; location?: boolean; field?: boolean; languages?: boolean },
): LabelFieldRow["align"] {
  if (!jobVal && !candVal) return "neutral";
  if (!jobVal || !candVal) return "neutral";
  if (opts.skills || opts.languages) {
    const mode = opts.languages ? "language" : "role";
    const jParts = canonicalList(jobVal.split(/,\s*/), mode);
    const cParts = canonicalList(candVal.split(/,\s*/), mode);
    const o = overlap(jParts, cParts);
    if (o >= 0.5) return "match";
    if (o > 0) return "partial";
    return "conflict";
  }
  if (opts.location) {
    const j = canonicalToken(jobVal, "location");
    const c = canonicalToken(candVal, "location");
    if (j && c && j === c) return "match";
    return textScore(j, c) >= 0.55 ? "match" : "conflict";
  }
  if (opts.field) {
    const j = canonicalToken(jobVal, "field");
    const c = canonicalToken(candVal, "field");
    if (j && c && j === c) return "match";
    return textScore(j, c) >= 0.55 ? "match" : "conflict";
  }
  const j = canonicalToken(jobVal, "role");
  const c = canonicalToken(candVal, "role");
  const s = textScore(j, c);
  if (s >= 0.55 || (j && c && j === c)) return "match";
  if (s >= 0.25) return "partial";
  return "conflict";
}

export function jobCandidateFieldRows(job: JobCard, candidate: CandidateCard): LabelFieldRow[] {
  const jobDisplay = job;
  const candDisplay = candidate;
  const jobCanon = enrichJobForRuleMatch(job);
  const candCanon = enrichCandidateForRuleMatch(candidate);

  const rows: {
    key: string;
    label: string;
    jDisplay: unknown;
    cDisplay: unknown;
    jCanon: unknown;
    cCanon: unknown;
    skills?: boolean;
    languages?: boolean;
    location?: boolean;
    field?: boolean;
  }[] = [
    {
      key: "title",
      label: "תפקיד",
      jDisplay: jobDisplay.title,
      cDisplay: candDisplay.desiredRole,
      jCanon: jobCanon.title,
      cCanon: candCanon.desiredRole,
    },
    {
      key: "field",
      label: "תחום",
      jDisplay: jobDisplay.field,
      cDisplay: candDisplay.field,
      jCanon: jobCanon.field,
      cCanon: candCanon.field,
      field: true,
    },
    {
      key: "location",
      label: "מיקום",
      jDisplay: jobDisplay.location,
      cDisplay: candDisplay.location,
      jCanon: jobCanon.location,
      cCanon: candCanon.location,
      location: true,
    },
    {
      key: "salary",
      label: "שכר",
      jDisplay: jobDisplay.salaryRange || jobDisplay.salaryMin,
      cDisplay: candDisplay.salaryExpectation || candDisplay.salaryMin,
      jCanon: jobDisplay.salaryRange || jobDisplay.salaryMin,
      cCanon: candDisplay.salaryExpectation || candDisplay.salaryMin,
    },
    {
      key: "seniority",
      label: "ותק",
      jDisplay: jobDisplay.seniorityLevel,
      cDisplay: candDisplay.experienceLevel,
      jCanon: jobDisplay.seniorityLevel,
      cCanon: candDisplay.experienceLevel,
    },
    {
      key: "experience",
      label: "שנות ניסיון",
      jDisplay: jobDisplay.minExperienceYears,
      cDisplay: candDisplay.experienceYears,
      jCanon: jobDisplay.minExperienceYears,
      cCanon: candDisplay.experienceYears,
    },
    {
      key: "mustHaves",
      label: "דרישות חובה",
      jDisplay: jobDisplay.mustHaves,
      cDisplay: candDisplay.skills,
      jCanon: jobCanon.mustHaves,
      cCanon: candCanon.skills,
      skills: true,
    },
    {
      key: "niceToHaves",
      label: "יתרון",
      jDisplay: jobDisplay.niceToHaves,
      cDisplay: candDisplay.softSkills,
      jCanon: jobDisplay.niceToHaves,
      cCanon: candDisplay.softSkills,
      skills: true,
    },
    {
      key: "languages",
      label: "שפות",
      jDisplay: jobDisplay.requiredLanguages,
      cDisplay: candDisplay.languages,
      jCanon: jobCanon.requiredLanguages,
      cCanon: candCanon.languages,
      languages: true,
    },
    {
      key: "shifts",
      label: "משמרות",
      jDisplay: jobDisplay.shiftPattern,
      cDisplay: candDisplay.shiftPreference,
      jCanon: jobDisplay.shiftPattern,
      cCanon: candDisplay.shiftPreference,
    },
    {
      key: "personality",
      label: "אופי / התאמה",
      jDisplay: jobDisplay.personalityFit,
      cDisplay: candDisplay.personality,
      jCanon: jobDisplay.personalityFit,
      cCanon: candDisplay.personality,
    },
    {
      key: "culture",
      label: "תרבות / סגנון",
      jDisplay: jobDisplay.teamCulture,
      cDisplay: candDisplay.workStyle,
      jCanon: jobDisplay.teamCulture,
      cCanon: candDisplay.workStyle,
    },
    {
      key: "physical",
      label: "דרישות פיזיות",
      jDisplay: jobDisplay.physicalDemands,
      cDisplay: candDisplay.physicalRequirementsOk,
      jCanon: jobDisplay.physicalDemands,
      cCanon: candDisplay.physicalRequirementsOk,
    },
    {
      key: "dealBreakers",
      label: "קווים אדומים",
      jDisplay: jobDisplay.dealBreakers,
      cDisplay: candDisplay.dealBreakers,
      jCanon: jobDisplay.dealBreakers,
      cCanon: candDisplay.dealBreakers,
    },
    {
      key: "flex",
      label: "גמישות (1–10)",
      jDisplay: jobDisplay.flexibility,
      cDisplay: candDisplay.flexibility,
      jCanon: jobDisplay.flexibility,
      cCanon: candDisplay.flexibility,
    },
    {
      key: "narrative",
      label: "סיפור / הקשר",
      jDisplay: jobDisplay.narrative,
      cDisplay: candDisplay.narrative,
      jCanon: jobDisplay.narrative,
      cCanon: candDisplay.narrative,
    },
  ];

  return rows.map((r) => {
    const jobValue = fmt(r.jDisplay);
    const candidateValue = fmt(r.cDisplay);
    const jobCompare = fmt(r.jCanon);
    const candCompare = fmt(r.cCanon);
    return {
      key: r.key,
      label: r.label,
      jobValue,
      candidateValue,
      align: alignPair(jobCompare, candCompare, {
        skills: r.skills,
        languages: r.languages,
        location: r.location,
        field: r.field,
      }),
    };
  });
}
