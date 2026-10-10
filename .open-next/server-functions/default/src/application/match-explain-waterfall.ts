import type { MatchScoreBreakdown } from "@/domain/match-score-breakdown";

export type WaterfallStepHe = {
  key: string;
  labelHe: string;
  value: number;
  /** Contribution vs previous step (can be negative). */
  delta: number;
};

export function breakdownWaterfallHe(b: MatchScoreBreakdown): WaterfallStepHe[] {
  const steps: WaterfallStepHe[] = [];
  let prev = 0;

  const push = (key: string, labelHe: string, value: number) => {
    steps.push({ key, labelHe, value, delta: value - prev });
    prev = value;
  };

  push("rule_base", "ציון rule (בסיס)", b.rule.baseFit);

  if (b.semantic) {
    push("semantic", "semantic מכויל", b.semantic.calibratedOverall);
  }

  if (b.hybrid) {
    push("hybrid_blend", "שילוב hybrid (לפני שערים)", b.hybrid.preGateBlend);
    if (b.hybrid.roleBoostApplied) {
      push("role_boost", "העלאת role-boost", b.hybrid.postRoleBoost);
    }
    if (b.hybrid.mustHaveLanguageGap) {
      push("lang_gap", "פער שפה ב-must-have", b.hybrid.afterMustHaveGate);
    } else if (b.hybrid.mustHaveOverlap < 1) {
      push("must_gate", "שער must-have", b.hybrid.afterMustHaveGate);
    }
  }

  push("flex", "אחרי גמישות משולבת", b.flexibility.finalScore);
  push("threshold", `סף ${(b.threshold * 100).toFixed(0)}%`, b.threshold);

  return steps;
}
