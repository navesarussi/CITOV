import type { Match } from "./types";

/** Employer may see CV / identifying candidate fields only after employer approved and candidate consented. */
export function employerCanViewCandidateIdentity(match: Match): boolean {
  return match.status === "approved" && Boolean(match.candidateConsentAt?.trim());
}
