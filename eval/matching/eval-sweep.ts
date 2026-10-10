import { DEFAULT_COSINE_FLOOR } from "../../src/domain/matching-calibration";
import { DEFAULT_HYBRID_WEIGHTS } from "../../src/domain/semantic-matching";

export const PRODUCTION_MATCH_DEFAULTS = {
  cosineFloor: DEFAULT_COSINE_FLOOR,
  semanticWeight: DEFAULT_HYBRID_WEIGHTS.semantic,
  ruleWeight: DEFAULT_HYBRID_WEIGHTS.rule,
  queueThreshold: 0.6,
};
