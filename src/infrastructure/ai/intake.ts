import { generateObject, generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import {
  candidateRows,
  filledCount,
  jobRows,
  nextMissingCandidateField,
  nextMissingJobField,
} from "@/domain/card-progress";
import type { CandidateCard, ChatMessage, FieldQuestion, JobCard } from "@/domain/types";
import { heuristicEmployeeIntake, heuristicEmployerIntake } from "./heuristic";
import {
  candidatePatchSchema,
  hasGeminiKey,
  jobPatchSchema,
  type IntakeResult,
} from "./schemas";

function model() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  return google("gemini-2.5-flash");
}

function historyText(chat: ChatMessage[]): string {
  return chat
    .slice(-16)
    .map((m) => `${m.role === "user" ? "משתמש" : "סוכן"}: ${m.content}`)
    .join("\n");
}

export async function runEmployeeIntake(params: {
  message: string;
  card: CandidateCard;
  chat: ChatMessage[];
  pendingQuestions: FieldQuestion[];
}): Promise<IntakeResult> {
  if (!hasGeminiKey()) {
    return heuristicEmployeeIntake(params.message, params.card, params.pendingQuestions);
  }

  try {
    const pending = params.pendingQuestions
      .map((q) => `- [${q.id}] ${q.question}`)
      .join("\n");
    const missing = nextMissingCandidateField(params.card);
    const progress = `${filledCount(candidateRows(params.card))}/${candidateRows(params.card).length}`;

    const { object } = await generateObject({
      model: model(),
      schema: z.object({
        reply: z.string(),
        patch: candidatePatchSchema,
        fieldAnswers: z
          .array(z.object({ questionId: z.string(), answer: z.string() }))
          .default([]),
      }),
      prompt: `את/ה סוכן השמה ישראלי מנוסה. מדבר/ת עברית טבעית, חמה וממוקדת.
מטרה: לשאוב כמה שיותר מידע לכרטיס מועמד מפורט — בלי טפסים.
כללי שיחה:
- שאלה אחת ברורה בכל תשובה (אפשר משפט אישור קצר לפני).
- אם המשתמש נתן כמה פרטים בבת אחת — חלץ את כולם ל-patch.
- אם יש שאלות תחום ממתינות — תן להן עדיפות.
- גמישות: 1=גמיש מאוד, 10=רק התאמה מדויקת. ודא שיש ערך מודע.
- אל תמציא מידע. שדות לא ידועים נשארים ריקים.
- הזכר בעדינות את התקדמות המילוי (${progress}).

שדה חסר מומלץ הבא: ${missing ? `${missing.label} (${missing.key})` : "אין — העמק בניואנסים"}

כרטיס נוכחי:
${JSON.stringify(params.card, null, 2)}

שאלות תחום ממתינות:
${pending || "אין"}

היסטוריה:
${historyText(params.chat)}

הודעה חדשה:
${params.message}`,
    });

    return {
      reply: object.reply,
      candidatePatch: object.patch,
      fieldAnswers: object.fieldAnswers,
      provider: "gemini",
    };
  } catch {
    return heuristicEmployeeIntake(params.message, params.card, params.pendingQuestions);
  }
}

export async function runEmployerIntake(params: {
  message: string;
  card: JobCard;
  chat: ChatMessage[];
}): Promise<IntakeResult> {
  if (!hasGeminiKey()) {
    return heuristicEmployerIntake(params.message, params.card);
  }

  try {
    const missing = nextMissingJobField(params.card);
    const progress = `${filledCount(jobRows(params.card))}/${jobRows(params.card).length}`;

    const { object } = await generateObject({
      model: model(),
      schema: z.object({
        reply: z.string(),
        patch: jobPatchSchema,
      }),
      prompt: `את/ה סוכן השמה ישראלי למעסיקים. עברית טבעית, מקצועית ונעימה.
מטרה: למלא כרטיס משרה עשיר משיחה חופשית.
כללים:
- שאלה אחת בכל תשובה + אישור קצר למה שנקלט.
- חלץ כמה שיותר שדות רלוונטיים מההודעה.
- אסוף גם זמינות לראיונות, אופי צוות, קווים אדומים ותנאים.
- אל תמציא. שדות לא ידועים ריקים.
- התקדמות מילוי: ${progress}. שדה מומלץ הבא: ${missing ? missing.label : "העמקה"}.

כרטיס נוכחי:
${JSON.stringify(params.card, null, 2)}

היסטוריה:
${historyText(params.chat)}

הודעה:
${params.message}`,
    });

    return {
      reply: object.reply,
      jobPatch: object.patch,
      provider: "gemini",
    };
  } catch {
    return heuristicEmployerIntake(params.message, params.card);
  }
}

export async function enrichReasonWithAi(
  reason: string,
  candidateSummary: string,
  jobSummary: string,
): Promise<string> {
  if (!hasGeminiKey()) return reason;
  try {
    const { text } = await generateText({
      model: model(),
      prompt: `נסח במשפט אחד בעברית, אנושי ובלי כותרות, למה המועמד והמשרה מתאימים.
מועמד: ${candidateSummary}
משרה: ${jobSummary}
בסיס: ${reason}`,
    });
    return text.trim() || reason;
  } catch {
    return reason;
  }
}
