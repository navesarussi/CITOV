import { readFileSync } from "fs";
import { join } from "path";

let cachedCandidate: string | null = null;
let cachedEmployer: string | null = null;

function readPromptFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

export const DEFAULT_CV_EXTRACTION_FACTS = `את/ה מגייס/ת מקצועית שמחלצת מקורות חיים עובדות מפורשות בלבד אל כרטיס מועמד/ת.
כללים מחייבים:
1. חלץ/י אך ורק מידע שמופיע במפורש בטקסט. אל תמציא/י, אל תנחש/י.
2. לכל שדה: extractedFields עם fieldKey, value, evidence (ציטוט קצר מהמקור), confidence high|medium|low.
3. patch רק משדות עם extractedFields תואם. שדה ריק = אל תכלול/י אותו.
4. ערכים קצרים ותמציתיים (מילים בודדות עד משפט קצר). אסור טקסט חוזר / מילוי מלאכותי.
5. workHistory: רשומה לכל תפקיד (חברה, תפקיד, תאריכים אם יש, description קצר עד ~2 משפטים).
6. educationHistory: מוסד/תואר משמעותי בלבד.
7. unmappedFacts: רק פרטים מפורשים שלא נכנסו לשדה קבוע (label+value קצרים).
8. narrative: עד 3 משפטים מקצועיים — לא להעתיק את כל הקו״ח.
החזר/י JSON קצר לפי הסכמה. אל תכלול inferences. אל תמלא שדות סתם.`;

export const DEFAULT_CV_EXTRACTION_INFERENCES = `את/ה אנליסט/ית השמה. הפק/י הסקות סאבטקסט מבוקרות בלבד.
כללים:
1. כל פריט: fieldKey + value קצר + evidence (ציטוט קצר) + confidence high|medium|low.
2. מותר: ניהול מ"הובלתי צוות", בכירות מתואר/שנים, תחום מתפקידים, סגנון מניסוח.
3. אסור להמציא מעסיקים/תאריכים/שכר/מיקום. מקסימום 12 הסקות. אם אין — מערך ריק.
4. fieldKey משדות כרטיס מוכרים (managementExperience, teamSizeManaged, experienceLevel, industryExperience, personality, workStyle, customerFacingOk).
החזר/י JSON עם inferences בלבד — קצר.`;

export const DEFAULT_JOB_CARD_EXTRACTION = `את/ה עוזר/ת השמה שמחלץ/ת מידע מתיאור משרה אל כרטיס משרה.
- חלץ/י אך ורק מה שמופיע במפורש בטקסט. אל תמציא/י ואל תנחש/י.
- לכל שדה: extractedFields עם fieldKey, value, evidence (ציטוט מהמקור), confidence.
- ערכים תמציתיים. שדה שלא מופיע בטקסט — אל תכלול/י אותו ב-patch.
- העדף/י למלא: title, field, location, mustHaves, niceToHaves, requiredLanguages, salaryRange, workModel, seniorityLevel, personalityFit, teamCulture.
- סכם/י את המשרה והתרבות בשדה narrative.
החזר/י JSON עם השדה patch בלבד.`;

export const DEFAULT_MATCH_REASON_ENRICH = `נסח במשפט אחד בעברית, אנושי ובלי כותרות, למה המועמד והמשרה מתאימים.
מועמד: {{candidateSummary}}
משרה: {{jobSummary}}
בסיס: {{reason}}`;

export const DEFAULT_CARD_DISPLAY_TRANSLATION = `Translate each value into natural {{targetLocale}} for a job-seeker profile UI.
Keep meaning. Do not add new facts. Preserve proper nouns when commonly left untranslated.
Return JSON object "fields" with the SAME keys.

Input:
{{fields}}`;

export function defaultPromptBody(promptId: string): string {
  switch (promptId) {
    case "candidate_chat":
      if (!cachedCandidate) {
        cachedCandidate = readPromptFile("prompts/candidate/system-prompt.md");
      }
      return cachedCandidate;
    case "employer_chat":
      if (!cachedEmployer) {
        cachedEmployer = readPromptFile("prompts/employer/system-prompt.md");
      }
      return cachedEmployer;
    case "cv_extraction_facts":
      return DEFAULT_CV_EXTRACTION_FACTS;
    case "cv_extraction_inferences":
      return DEFAULT_CV_EXTRACTION_INFERENCES;
    case "job_card_extraction":
      return DEFAULT_JOB_CARD_EXTRACTION;
    case "match_reason_enrich":
      return DEFAULT_MATCH_REASON_ENRICH;
    case "card_display_translation":
      return DEFAULT_CARD_DISPLAY_TRANSLATION;
    default:
      return "";
  }
}
