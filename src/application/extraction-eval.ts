import { gateExtractedFields } from "@/domain/extraction-evidence";
import { goldenExtractionCases } from "../../eval/extraction/golden-dataset";

export type ExtractionEvalMetrics = {
  cases: number;
  cvCases: number;
  jobCases: number;
  /** With gating (current). */
  precision: number;
  recall: number;
  hallucinationRate: number;
  /** Naive: accept all model fields without gating. */
  baselinePrecision: number;
  baselineRecall: number;
  baselineHallucinationRate: number;
  evaluatedAt: string;
};

function scoreCase(params: {
  sourceText: string;
  modelFields: { fieldKey: string; value: string; evidence: string; confidence?: "high" | "medium" | "low" }[];
  expectAccept: string[];
  expectReject: string[];
  useGate: boolean;
}): { tp: number; fp: number; fn: number; hallucinations: number; totalModel: number } {
  const patch = Object.fromEntries(params.modelFields.map((f) => [f.fieldKey, f.value]));
  const acceptedKeys = params.useGate
    ? Object.keys(
        gateExtractedFields({
          sourceText: params.sourceText,
          patch,
          extractedFields: params.modelFields,
        }).acceptedPatch,
      )
    : params.modelFields.map((f) => f.fieldKey);

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let hallucinations = 0;
  for (const key of params.expectAccept) {
    if (acceptedKeys.includes(key)) tp += 1;
    else fn += 1;
  }
  for (const key of params.expectReject) {
    if (acceptedKeys.includes(key)) {
      fp += 1;
      hallucinations += 1;
    }
  }
  return { tp, fp, fn, hallucinations, totalModel: params.modelFields.length };
}

export function runExtractionEval(): ExtractionEvalMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let hall = 0;
  let modelTotal = 0;
  let btp = 0;
  let bfp = 0;
  let bfn = 0;
  let bhall = 0;

  for (const c of goldenExtractionCases) {
    const gated = scoreCase({
      sourceText: c.sourceText,
      modelFields: c.modelFields,
      expectAccept: c.expectAccept,
      expectReject: c.expectReject,
      useGate: true,
    });
    tp += gated.tp;
    fp += gated.fp;
    fn += gated.fn;
    hall += gated.hallucinations;
    modelTotal += gated.totalModel;

    const base = scoreCase({
      sourceText: c.sourceText,
      modelFields: c.modelFields,
      expectAccept: c.expectAccept,
      expectReject: c.expectReject,
      useGate: false,
    });
    btp += base.tp;
    bfp += base.fp;
    bfn += base.fn;
    bhall += base.hallucinations;
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const hallucinationRate = modelTotal === 0 ? 0 : hall / modelTotal;

  const baselinePrecision = btp + bfp === 0 ? 1 : btp / (btp + bfp);
  const baselineRecall = btp + bfn === 0 ? 1 : btp / (btp + bfn);
  const baselineHallucinationRate = modelTotal === 0 ? 0 : bhall / modelTotal;

  return {
    cases: goldenExtractionCases.length,
    cvCases: goldenExtractionCases.filter((c) => c.kind === "cv").length,
    jobCases: goldenExtractionCases.filter((c) => c.kind === "job").length,
    precision,
    recall,
    hallucinationRate,
    baselinePrecision,
    baselineRecall,
    baselineHallucinationRate,
    evaluatedAt: new Date().toISOString(),
  };
}
