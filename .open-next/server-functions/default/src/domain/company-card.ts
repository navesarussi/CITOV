import type { JobCard } from "./types";

/** Company-level profile (one per employer account). Job cards hold role-specific detail. */
export type CompanyCard = {
  name: string;
  industry: string;
  size: string;
  headquarters: string;
  culture: string;
  values: string;
  workEnvironment: string;
  benefitsSummary: string;
  website: string;
  summary: string;
  narrative: string;
};

export function emptyCompanyCard(): CompanyCard {
  return {
    name: "",
    industry: "",
    size: "",
    headquarters: "",
    culture: "",
    values: "",
    workEnvironment: "",
    benefitsSummary: "",
    website: "",
    summary: "",
    narrative: "",
  };
}

export function companyCardFromJobAndName(
  name: string,
  job: JobCard,
): CompanyCard {
  return {
    name: name.trim(),
    industry: job.industry?.trim() ?? "",
    size: job.companySize?.trim() ?? "",
    headquarters: job.location?.trim() ?? "",
    culture: job.teamCulture?.trim() ?? "",
    values: job.managementStyle?.trim() ?? "",
    workEnvironment: job.workModel?.trim() ?? "",
    benefitsSummary: job.benefits?.trim() ?? "",
    website: "",
    summary: job.companyDescription?.trim() ?? job.summary?.trim() ?? "",
    narrative: job.narrative?.trim() ?? "",
  };
}
