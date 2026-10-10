import { runExtractionEval } from "../src/application/extraction-eval";

const r = runExtractionEval();
console.log("Extraction eval (golden set)");
console.log(`cases: ${r.cases} (cv ${r.cvCases}, job ${r.jobCases})`);
console.log(
  `AFTER  precision=${(r.precision * 100).toFixed(1)}% recall=${(r.recall * 100).toFixed(1)}% halluc=${(r.hallucinationRate * 100).toFixed(1)}%`,
);
console.log(
  `BEFORE precision=${(r.baselinePrecision * 100).toFixed(1)}% recall=${(r.baselineRecall * 100).toFixed(1)}% halluc=${(r.baselineHallucinationRate * 100).toFixed(1)}%`,
);
