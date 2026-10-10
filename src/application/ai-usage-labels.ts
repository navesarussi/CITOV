import type { AiUsageType } from "@/domain/types";

const AI_USAGE_TYPE_LABELS_HE: Record<AiUsageType, string> = {
  employee_intake: "שיחת מועמד/ת",
  employer_intake: "שיחת מעסיק/ה",
  admin_intake: "שיחת מנהל",
  cv_import: "ייבוא קורות חיים",
  cv_extraction: "חילוץ מקורות חיים",
  embedding: "ייצוג וקטורי",
  job_import: "ייבוא תיאור משרה",
  enrich_reason: "העשרת הסבר התאמה",
  eval: "הערכת מנוע",
  llm_judge: "שופט LLM",
  chat: "צ'אט",
};

export function aiUsageTypeLabelHe(type: AiUsageType | string): string {
  if (type in AI_USAGE_TYPE_LABELS_HE) {
    return AI_USAGE_TYPE_LABELS_HE[type as AiUsageType];
  }
  return type;
}
