import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchingEvalDataset } from "../../eval/matching/dataset";
import { mergeEvalFixtureIntoIndex } from "./eval-embedding-index";
import { resolveLabelingPair } from "./labeling-pair-resolve";
import { explainMatchPair } from "./match-pair-explain";
import { evalFixtureIndexOnly } from "./eval-embedding-index";
import type { StoreData } from "@/domain/types";

describe("labeling-pair-resolve", () => {
  it("scores holdout eval pair with fixture embeddings", () => {
    const row = { job_id: "j22", candidate_id: "c11" };
    const job = matchingEvalDataset.jobs.find((j) => j.id === row.job_id);
    const cand = matchingEvalDataset.candidates.find((c) => c.id === row.candidate_id);
    assert.ok(job && cand);
    const store = { users: [], employees: [], employers: [], fieldQuestions: [], fieldAnswers: [], matches: [] } as StoreData;
    const resolved = resolveLabelingPair(store, row.job_id, row.candidate_id);
    assert.ok(resolved);
    const index = mergeEvalFixtureIntoIndex(evalFixtureIndexOnly());
    const ex = explainMatchPair({
      candidate: resolved!.candidate,
      job: resolved!.job,
      candidateId: row.candidate_id,
      jobId: row.job_id,
      vectors: {
        candidate: index.candidate.get(row.candidate_id)!,
        job: index.job.get(row.job_id)!,
      },
    });
    assert.ok(ex.ruleScore > 0 || ex.hybridScore > 0);
  });
});
