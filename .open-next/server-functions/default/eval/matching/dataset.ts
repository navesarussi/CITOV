import { buildDataset } from "./card-helpers";
import { seedCandidates } from "./seed-candidates";
import { seedJobs } from "./seed-jobs";
import { seedLabels } from "./seed-labels";

export const matchingEvalDataset = buildDataset(seedJobs, seedCandidates, seedLabels);
