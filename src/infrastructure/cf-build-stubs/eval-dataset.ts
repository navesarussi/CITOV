import type { MatchingEvalDataset } from "@/domain/matching-eval/types";

/** Workers build: omit eval seed cards (demo seed / holdout maps use store on CF). */
export const matchingEvalDataset: MatchingEvalDataset = {
  version: "cf-stub",
  description: "Stripped for Cloudflare Workers bundle size",
  jobs: [],
  candidates: [],
  labels: [],
};
