/**
 * תוכן ארכיטקטורה לפורטל — מסונכרן עם docs/architecture.html ו־docs/PROMPTS.md.
 * בממשק: ללא נתיבי קוד; נתיבים רק ב־technicalPaths למקטע «פרטים טכניים».
 */
import { adminTerms as T } from "@/i18n/admin-terms";

export type ArchitectureNodeId =
  | "browser"
  | "next"
  | "api"
  | "chat"
  | "cv"
  | "matching"
  | "embeddings"
  | "postgres"
  | "gemini"
  | "monitoring"
  | "cron";

export type ArchitectureNode = {
  id: ArchitectureNodeId;
  titleHe: string;
  summaryHe: string;
  decisionHe: string;
  technicalPaths: string[];
};

export type FlowStep = {
  titleHe: string;
  bodyHe: string;
  kind: "code" | "model" | "both";
};

export type EngineeringDilemma = {
  titleHe: string;
  optionsHe: string[];
  choiceHe: string;
  whyHe: string;
};

export type ArchitectureEdge = { from: ArchitectureNodeId; to: ArchitectureNodeId };

/** Logical data/control links for the interactive diagram (not every HTTP hop). */
export const ARCHITECTURE_EDGES: ArchitectureEdge[] = [
  { from: "browser", to: "next" },
  { from: "next", to: "api" },
  { from: "api", to: "chat" },
  { from: "api", to: "cv" },
  { from: "api", to: "matching" },
  { from: "chat", to: "gemini" },
  { from: "cv", to: "gemini" },
  { from: "matching", to: "embeddings" },
  { from: "embeddings", to: "gemini" },
  { from: "api", to: "postgres" },
  { from: "matching", to: "postgres" },
  { from: "monitoring", to: "postgres" },
  { from: "monitoring", to: "cron" },
  { from: "cron", to: "gemini" },
  { from: "cron", to: "chat" },
];

export const ARCHITECTURE_NODES: ArchitectureNode[] = [
  {
    id: "browser",
    titleHe: "דפדפן המשתמש",
    summaryHe: "ממשק מועמדים ומעסיקים — שיחה, כרטיסים והזדמנויות מאושרות בלבד.",
    decisionHe: "ללא חיפוש חופשי: החוויה מונחית שיחה והצגת תוצאות מסוננות.",
    technicalPaths: ["src/app/employee", "src/app/employer", "src/components/ChatPanel.tsx"],
  },
  {
    id: "next",
    titleHe: "Next.js (שרת + ממשק)",
    summaryHe: "רינדור דפים, ניתוב API, וזרימת נתונים מאובטחת בין הדפדפן לבסיס הנתונים.",
    decisionHe: "לוגיקה רגישה וקריאות למודל רצות בשרת בלבד — לא בדפדפן.",
    technicalPaths: ["src/app", "next.config.ts"],
  },
  {
    id: "api",
    titleHe: "שכבת API",
    summaryHe: "נקודות קצה לשיחה, קורות חיים, התאמות, ופורטל מנהלים — עם בדיקת הרשאות לכל פעולה.",
    decisionHe: "כל בקשה נבדקת מול המשתמש הפעיל; אין גישה לנתוני זרים.",
    technicalPaths: ["src/app/api/chat/route.ts", "src/infrastructure/auth-guard.ts"],
  },
  {
    id: "chat",
    titleHe: T.chatAgent,
    summaryHe: "שיחה טבעית שממלאת כרטיס מועמד או כרטיס משרה, כולל שאלות המשך ופתרון סתירות.",
    decisionHe: "הפרדה בין תשובת משתמש (זרימה) לחילוץ מבנה (אובייקט) — חוויה מהירה ויציבות שדות.",
    technicalPaths: ["src/application/chat-turn.ts", "src/infrastructure/ai/intake.ts"],
  },
  {
    id: "cv",
    titleHe: T.cvExtraction,
    summaryHe: "העלאת קובץ → ניתוח בשני שלבים → מיזוג לכרטיס עם ראיות ורמת אמינות.",
    decisionHe: "שלב ראשון ממפה עובדות; שלב שני ממלא שדות רק עם ראיה בטקסט — מפחית המצאות.",
    technicalPaths: ["src/infrastructure/ai/cv-extraction.ts", "src/domain/extraction-evidence.ts"],
  },
  {
    id: "matching",
    titleHe: T.matchingEngine,
    summaryHe: `שילוב ${T.ruleScore} ו${T.hybridScore}, שער דרישות חובה, ו${T.calibration} — ואז החלטת ${T.queue} לפי ${T.threshold}.`,
    decisionHe: "ברירת מחדל: היברידי עם רצפת דמיון — לא pure semantic, כדי לשמור על שליטה בדרישות קשיחות.",
    technicalPaths: ["src/application/match-scoring.ts", "docs/eval/ROLE_BOOST.md"],
  },
  {
    id: "embeddings",
    titleHe: T.embedding,
    summaryHe: "הטמעות לפי מקטעים (תפקיד, כישורים, פרופיל) לכל כרטיס — מתעדכנות כשהכרטיס משתנה.",
    decisionHe: "מקטעים נפרדים במקום וקטור יחיד — מאפשר לשקלל תפקיד מול כישורים בנפרד.",
    technicalPaths: ["src/infrastructure/db/card-embeddings.ts", "src/domain/semantic-matching.ts"],
  },
  {
    id: "postgres",
    titleHe: "Supabase Postgres",
    summaryHe: "משתמשים, כרטיסים, התאמות, תיוגים, שימוש ב-AI, ואירועי מערכת — כולל pgvector.",
    decisionHe: "JSONB לכרטיסים + טבלאות מנורמלות — גמישות POC עם שאילתות אמיתיות.",
    technicalPaths: ["src/infrastructure/db/normalized-store.ts", "src/infrastructure/db/schema.ts"],
  },
  {
    id: "gemini",
    titleHe: "Gemini",
    summaryHe: "מודל לשיחה, חילוץ, שיפוט זוגות בדיקה, והטמעות — עם מגבלות תקציב ושחזור ב degrad.",
    decisionHe: "מפתח API רק בשרת; נפילה → heuristics + תור שחזור — לא לחסום את המשתמש.",
    technicalPaths: ["src/infrastructure/ai/gemini-client.ts", "src/application/recover-degraded-turns.ts"],
  },
  {
    id: "monitoring",
    titleHe: T.monitoring,
    summaryHe: "איסוף שגיאות, איטיות, כשלי AI, ודוחות E2E — לוח מנהלים עם קיבוץ לפי סוג.",
    decisionHe: "אירועים עם fingerprint — לזהות רגרסיות בלי לצפות בלוגים ידנית.",
    technicalPaths: ["src/application/monitoring-dashboard.ts", "src/infrastructure/db/app-events.ts"],
  },
  {
    id: "cron",
    titleHe: T.recovery,
    summaryHe: "משימה מתוזמנת שמנסה לשחזר תורות שיחה שנפלו ל-heuristic כשהמודל חוזר.",
    decisionHe: "שחזור אסינכרוני — לא לחזור על ביצוע סיכון כפול בזמן אמת.",
    technicalPaths: ["src/app/api/cron/recover-degraded/route.ts"],
  },
];

export const ARCHITECTURE_FLOWS: Record<
  "cvUpload" | "chatMessage" | "matchPipeline" | "geminiDown",
  { titleHe: string; steps: FlowStep[] }
> = {
  cvUpload: {
    titleHe: "מועמד מעלה קורות חיים",
    steps: [
      { titleHe: "העלאה", bodyHe: "הקובץ נשמר בצורה מאובטחת ומקושר לפרופיל.", kind: "code" },
      { titleHe: "ניתוח מסמך", bodyHe: "Gemini קורא את הטקסת ומחלץ עובדות עם ראיות.", kind: "model" },
      { titleHe: "אימות ראיות", bodyHe: "שדות ללא ראיה בטקסט נחסמים — מפחית המצאות.", kind: "code" },
      { titleHe: "מיזוג לכרטיס", bodyHe: "הכרטיס מתעדכן; סתירות נפתחות לשיחה.", kind: "code" },
      { titleHe: "הודעת פתיחה", bodyHe: "סוכן השיחה מציג סיכום ושואל על חוסרים.", kind: "both" },
    ],
  },
  chatMessage: {
    titleHe: "הודעת צ׳אט",
    steps: [
      { titleHe: "קבלה", bodyHe: "השרת מאמת סשן ומגביל קצב קריאות AI.", kind: "code" },
      { titleHe: "הקשר", bodyHe: "נבנית רשימת הודעות + כרטיס + שאלות פתוחות.", kind: "code" },
      { titleHe: "תשובה זורמת", bodyHe: "Gemini מייצר תשובה למשתמש בזמן אמת.", kind: "model" },
      { titleHe: "חילוץ מבנה", bodyHe: "במקביל — עדכון שדות בכרטיס מהודעה.", kind: "model" },
      { titleHe: "שמירה", bodyHe: "הודעות, כרטיס, ושימוש AI נרשמים.", kind: "code" },
      { titleHe: "הטמעה + התאמה", bodyHe: "רענון ייצוג וקטורי ותזמון בניית התאמות.", kind: "code" },
    ],
  },
  matchPipeline: {
    titleHe: "חישוב התאמה (צינור בן 8 שלבים)",
    steps: [
      { titleHe: "זוג מועמד–משרה", bodyHe: "נבחרים כרטיסים מלאים מהמאגר.", kind: "code" },
      { titleHe: T.ruleScore, bodyHe: "חפיפת שדות, תפקיד, מיקום, דרישות.", kind: "code" },
      { titleHe: T.embedding, bodyHe: "דמיון קוסינוס לפי מקטעים.", kind: "model" },
      { titleHe: "שילוב היברידי", bodyHe: "משקלים קבועים + רצפת דמיון — ראו מסמכי כיול.", kind: "code" },
      { titleHe: "שער חובה", bodyHe: "דרישות חובה חסרות מורידות את הציון החכם.", kind: "code" },
      { titleHe: "גמישות", bodyHe: "סרגל גמישות משרה מכוון את החמרת הכללים.", kind: "code" },
      { titleHe: T.threshold, bodyHe: `השוואה ל${T.threshold} — כניסה ל${T.queue} או דחייה.`, kind: "code" },
      { titleHe: "שמירה", bodyHe: "נשמר ציון, פירוט, וסטטוס — לתצוגה ולתיוג.", kind: "code" },
    ],
  },
  geminiDown: {
    titleHe: "כש-Gemini נופל",
    steps: [
      { titleHe: "זיהוי", bodyHe: "Timeout, 429, או תשובה ריקה.", kind: "code" },
      { titleHe: "מצב מוגבל", bodyHe: "תשובת heuristic + הודעה שקופה למשתמש.", kind: "code" },
      { titleHe: "תור שחזור", bodyHe: "הודעה נשמרת לשחזור מאוחר יותר.", kind: "code" },
      { titleHe: "Cron", bodyHe: "כשהשירות חוזר — ניסיון intake מלא מחדש.", kind: "code" },
    ],
  },
};

export const AI_SAFETY_SECTIONS = [
  {
    titleHe: "זהות ופרופיל",
    bodyHe: "שם בקורות חיים לא מניחים שהוא בעל החשבון — נדרש אישור לפני קישור לכרטיס.",
  },
  {
    titleHe: "הזרקת הנחיות",
    bodyHe: "טקסט משתמש מוצג כתוכן, לא כהוראות מערכת; תבניות פרומпт נשמרות בשרת.",
  },
  {
    titleHe: "ראיות בחילוץ",
    bodyHe: "שדה נכנס לכרטיס רק אם יש ציטוט/ראיה בטקסט המקור — מדיד ב-eval זהב.",
  },
  {
    titleHe: "הרשאות",
    bodyHe: "כל API בודק שהמשתמש פועל על הנתונים שלו; מנהלים בנתיבים נפרדים.",
  },
];

export const ENGINEERING_DILEMMAS: EngineeringDilemma[] = [
  {
    titleHe: "וקטור אחד מול מקטעים",
    optionsHe: ["וקטור יחיד לכל כרטיס", "מקטעים: תפקיד / כישורים / פרופיל"],
    choiceHe: "מקטעים נפרדים",
    whyHe: "מאפשר משקלים שונים ופירוט ציון — קריטי לכיול ולהסבר למנהל.",
  },
  {
    titleHe: "סמנטי טהור מול היברידי",
    optionsHe: ["דירוג לפי דמיון בלבד", "כללים + דמיון + שער חובה"],
    choiceHe: "היברידי עם כיול",
    whyHe: "דרישות קשיחות (רישיון, שפה) לא נעלמות בתוך embedding.",
  },
  {
    titleHe: "חילוץ CV ב-pass אחד או שניים",
    optionsHe: ["קריאה אחת", "מיפוי + מילוי מבוקר"],
    choiceHe: "שני שלבים",
    whyHe: "שליטה באיכות ופחות שדות מומצאים.",
  },
  {
    titleHe: "כרטיס כסיכום מתגלגל",
    optionsHe: ["רק DB relation", "כרטיס JSONB מעודכן מהשיחה וה-CV"],
    choiceHe: "כרטיס מתגלגל",
    whyHe: "מקור אמת אחד ל-UI, להתאמה ול-Gemini.",
  },
  {
    titleHe: "Retrieve-then-rerank (עתיד)",
    optionsHe: ["דירוג מלא על כל הזוגות", "מסנן מהיר + rerank"],
    choiceHe: "מתוכנן — כרגע rebuild מלא ב-POC",
    whyHe: "בקנה מידה גדול — חובה לפני עלייה בנפח משתמשים.",
  },
];
