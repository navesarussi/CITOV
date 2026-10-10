export type PromptVariable = {
  key: string;
  labelHe: string;
  descriptionHe: string;
};

export type PromptDefinition = {
  id: string;
  nameHe: string;
  purposeHe: string;
  whenSentHe: string;
  category: "chat" | "extraction" | "matching" | "translation";
  variables: PromptVariable[];
  /** Uses admin_settings candidate/employer columns when true. */
  legacyAdminField?: "candidate" | "employer";
  supportsEval?: boolean;
};

export const PROMPT_VARIABLES_CHAT: PromptVariable[] = [
  { key: "known_facts", labelHe: "עובדות ידועות", descriptionHe: "מה שכבר ידוע מהכרטיס והשיחה" },
  { key: "current_card", labelHe: "כרטיס נוכחי", descriptionHe: "מצב הכרטיס בזמן השיחה (JSON מצומצם)" },
  { key: "missing_field_key", labelHe: "שדה חסר", descriptionHe: "השדה הבא שהסוכן צריך להשלים" },
  { key: "pending_field_questions", labelHe: "שאלות תחום", descriptionHe: "שאלות ממתינות ממעסיקים/מערכת" },
  { key: "recent_agent_questions", labelHe: "שאלות אחרונות", descriptionHe: "מה הסוכן כבר שאל כדי לא לחזור" },
  { key: "chat_history", labelHe: "היסטוריית שיחה", descriptionHe: "מגיעה כהודעות נפרדות (messages)" },
  { key: "new_message", labelHe: "הודעה חדשה", descriptionHe: "הודעת המשתמש האחרונה" },
];

export const PROMPT_DEFINITIONS: PromptDefinition[] = [
  {
    id: "candidate_chat",
    nameHe: "סוכן שיחה — מועמד",
    purposeHe: "מנחה את שיחת הצ'אט עם מחפש/ת עבודה: טון, שאלות, ועדכון כרטיס.",
    whenSentHe: "בכל הודעת צ'אט מועמד (מערכת + הקשר דינמי).",
    category: "chat",
    variables: PROMPT_VARIABLES_CHAT,
    legacyAdminField: "candidate",
    supportsEval: true,
  },
  {
    id: "employer_chat",
    nameHe: "סוכן שיחה — מעסיק",
    purposeHe: "מנחה שיחה לפתיחת משרה ומילוי כרטיס משרה.",
    whenSentHe: "בכל הודעת צ'אט מעסיק.",
    category: "chat",
    variables: PROMPT_VARIABLES_CHAT,
    legacyAdminField: "employer",
    supportsEval: true,
  },
  {
    id: "cv_extraction_facts",
    nameHe: "חילוץ קו״ח — עובדות",
    purposeHe: "מחלץ עובדות מפורשות מקורות חיים לכרטיס מועמד.",
    whenSentHe: "אחרי העלאת/עדכון קובץ קו״ח (ניתוח Gemini).",
    category: "extraction",
    variables: [],
  },
  {
    id: "cv_extraction_inferences",
    nameHe: "חילוץ קו״ח — הסקות",
    purposeHe: "הסקות מבוקרות (ניסיון, ניהול, סגנון) עם evidence.",
    whenSentHe: "שלב שני בניתוח קו״ח, אחרי עובדות.",
    category: "extraction",
    variables: [],
  },
  {
    id: "job_card_extraction",
    nameHe: "חילוץ כרטיס משרה",
    purposeHe: "ממלא כרטיס משרה מתיאור משרה (PDF/טקסט).",
    whenSentHe: "ייבוא תיאור משרה או העלאת קובץ מעסיק.",
    category: "extraction",
    variables: [],
  },
  {
    id: "match_reason_enrich",
    nameHe: "ניסוח סיבת התאמה",
    purposeHe: "משפר ניסוח קצר בעברית למה מועמד ומשרה מתאימים.",
    whenSentHe: "אופציונלי — כשמפעילים העשרת AI לסיבת התאמה.",
    category: "matching",
    variables: [
      { key: "candidateSummary", labelHe: "סיכום מועמד", descriptionHe: "תקציר כרטיס מועמד" },
      { key: "jobSummary", labelHe: "סיכום משרה", descriptionHe: "תקציר כרטיס משרה" },
      { key: "reason", labelHe: "בסיס", descriptionHe: "סיבה rule-based לפני העשרה" },
    ],
    supportsEval: true,
  },
  {
    id: "card_display_translation",
    nameHe: "תרגום תצוגת כרטיס",
    purposeHe: "מתרגם שדות תצוגה לעברית/אנגלית בלי להמציא עובדות.",
    whenSentHe: "אחרי ניתוח קו״ח כשיש שדות בשפה זרה ל-UI.",
    category: "translation",
    variables: [
      { key: "targetLocale", labelHe: "שפת יעד", descriptionHe: "he או en" },
      { key: "fields", labelHe: "שדות", descriptionHe: "מפת שדה→טקסט לתרגום" },
    ],
  },
];

export function getPromptDefinition(id: string): PromptDefinition | undefined {
  return PROMPT_DEFINITIONS.find((p) => p.id === id);
}
