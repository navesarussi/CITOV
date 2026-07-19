import {
  nextMissingCandidateField,
  nextMissingJobField,
  candidateRows,
  jobRows,
  filledCount,
} from "@/domain/card-progress";
import type { CandidateCard, FieldQuestion, JobCard } from "@/domain/types";
import type { CandidatePatch, IntakeResult, JobPatch } from "./schemas";

function pickFlexibility(text: string): number | undefined {
  const m = text.match(/(?:גמיש(?:ות)?|flexibility)\s*[:=]?\s*(\d{1,2})/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 10) return n;
  }
  if (/גמיש מאוד|מאוד גמיש|לא אכפת|פתוח לכל/.test(text)) return 2;
  if (/מדויק|בלי פשרות|רק אם מתאים בדיוק|חשוב לי שיהיה מדויק/.test(text)) return 9;
  return undefined;
}

function extractList(text: string, label: RegExp): string[] {
  const m = text.match(label);
  if (!m?.[1]) return [];
  return m[1]
    .split(/,|ו|·|\|/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function extractCandidatePatch(message: string, card: CandidateCard): CandidatePatch {
  const patch: CandidatePatch = {};
  const lower = message;

  if (/מלצר|ברמן|מארח|שף|טבח|קופאי|מחסנ|שליח|מנהל|נציג/.test(lower)) {
    patch.desiredRole =
      lower.match(
        /מלצר(?:ית)?|ברמן|מארח(?:ת)?|שף|טבח(?:ית)?|קופאי(?:ת)?|מחסנאי|שליח|מנהל(?:ת)?|נציג(?:ת)?/,
      )?.[0] ?? card.desiredRole;
  }
  if (/מסעד|בית קפה|בר\b|מזון/.test(lower)) patch.field = "מסעדנות";
  if (/מחסן|לוגיסט|הפצה|שילוח/.test(lower)) patch.field = "לוגיסטיקה";
  if (/מכירות|שירות לקוחות/.test(lower)) patch.field = patch.field || "מכירות";
  if (/תל אביב|חיפה|ירושלים|באר שבע|רמת גן|פתח תקווה|נתניה|הרצליה/.test(lower)) {
    patch.location = lower.match(
      /תל אביב|חיפה|ירושלים|באר שבע|רמת גן|פתח תקווה|נתניה|הרצליה/,
    )?.[0];
  }
  if (/היברידי|מהבית|ריחוק|משרד/.test(lower)) patch.remotePreference = message.slice(0, 80);
  const years = lower.match(/(\d+)\s*שנ(?:ות|ה)/);
  if (years) patch.experienceYears = Number(years[1]);
  if (/ג׳וניור|ג׳וניור|junior|בכיר|סיניור|senior|ביניים/.test(lower)) {
    patch.experienceLevel = lower.match(/ג׳וניור|junior|בכיר|סיניור|senior|ביניים/i)?.[0];
  }
  const skills = extractList(lower, /כישור(?:ים)?[:\s]+(.+)/i);
  if (skills.length) patch.skills = skills;
  if (/שכר|משכורת|₪|שקל/.test(lower)) {
    patch.salaryExpectation = message.slice(0, 80);
    const nums = lower.match(/(\d{4,6})/g);
    if (nums?.[0]) patch.salaryMin = nums[0];
    if (nums?.[1]) patch.salaryMax = nums[1];
  }
  if (/מלאה|חלקית|100%|50%|פרילנס/.test(lower)) patch.employmentType = message.slice(0, 60);
  if (/משמרות|בוקר|ערב|לילה/.test(lower)) patch.shiftPreference = message.slice(0, 80);
  if (/לילה/.test(lower)) patch.nightShiftsOk = /לא.*לילה|בלי לילה/.test(lower) ? "לא" : "כן";
  if (/סופ.?שבוע|שישי|שבת/.test(lower)) {
    patch.weekendsOk = /לא.*סופ|בלי סופ/.test(lower) ? "לא" : "כן";
  }
  if (/רכב|אוטובוס|רכבת|נהיגה/.test(lower)) patch.transportation = message.slice(0, 80);
  if (/רישיון/.test(lower)) patch.drivingLicense = message.slice(0, 60);
  if (/אופי|רגוע|אנרגטי|אחראי|יסודי|חברותי|דייקן/.test(lower)) {
    patch.personality = message.slice(0, 160);
  }
  if (/סגנון|עצמאי|צוות|לבד/.test(lower)) patch.workStyle = message.slice(0, 120);
  if (/חוזק|טוב ב/.test(lower)) patch.strengths = message.slice(0, 120);
  if (/זמין|אחה״צ|בוקר|ראיון/.test(lower)) {
    patch.availability = message.slice(0, 120);
    patch.interviewAvailability = message.slice(0, 120);
  }
  if (/להתחיל|מיידי|שבוע|חודש/.test(lower)) patch.startDate = message.slice(0, 80);
  if (/עברית/.test(lower)) patch.hebrewLevel = message.slice(0, 60);
  if (/אנגלית|english/.test(lower)) patch.englishLevel = message.slice(0, 60);
  if (/תואר|תיכון|קורס|השכלה/.test(lower)) patch.education = message.slice(0, 100);
  if (/קהל|לקוחות/.test(lower)) patch.customerFacingOk = "כן";
  if (/ניהול|צוות/.test(lower)) patch.managementExperience = message.slice(0, 100);
  if (/לא מוכן|בלי|קו אדום|לא אסכים/.test(lower)) patch.dealBreakers = message.slice(0, 120);
  const flex = pickFlexibility(lower);
  if (flex) patch.flexibility = flex;

  return patch;
}

function extractJobPatch(message: string, card: JobCard): JobPatch {
  const patch: JobPatch = {};
  const lower = message;

  if (/מלצר|ברמן|מארח|שף|טבח|מחסנ|שליח|קופאי|מנהל|נציג/.test(lower)) {
    patch.title = lower.match(
      /מלצר(?:ית)?|ברמן|מארח(?:ת)?|שף|טבח(?:ית)?|מחסנאי|שליח|קופאי(?:ת)?|מנהל(?:ת)?|נציג(?:ת)?/,
    )?.[0];
  }
  if (/מסעד|בית קפה|בר\b/.test(lower)) patch.field = "מסעדנות";
  if (/מחסן|לוגיסט|הפצה/.test(lower)) patch.field = "לוגיסטיקה";
  if (/מכירות|שירות/.test(lower)) patch.field = patch.field || "מכירות";
  if (/תל אביב|חיפה|ירושלים|באר שבע|רמת גן|פתח תקווה|נתניה|הרצליה/.test(lower)) {
    patch.location = lower.match(
      /תל אביב|חיפה|ירושלים|באר שבע|רמת גן|פתח תקווה|נתניה|הרצליה/,
    )?.[0];
  }
  if (/היברידי|מהבית|ריחוק|משרד/.test(lower)) patch.workModel = message.slice(0, 80);
  if (/מלאה|חלקית|100%|50%/.test(lower)) patch.scope = message.slice(0, 80);
  if (/שכר|₪|שקל/.test(lower)) {
    patch.salaryRange = message.slice(0, 80);
    const nums = lower.match(/(\d{4,6})/g);
    if (nums?.[0]) patch.salaryMin = nums[0];
    if (nums?.[1]) patch.salaryMax = nums[1];
  }
  const must = extractList(lower, /חובה[:\s]+(.+)/i);
  if (must.length) patch.mustHaves = must;
  const nice = extractList(lower, /יתרון[:\s]+(.+)/i);
  if (nice.length) patch.niceToHaves = nice;
  if (/אופי|צוות|אנרגטי|רגוע|שירותי/.test(lower)) patch.personalityFit = message.slice(0, 160);
  if (/תרבות|אווירה/.test(lower)) patch.teamCulture = message.slice(0, 120);
  if (/ראיון|זמין|יום|שעה|אחה״צ/.test(lower)) {
    patch.interviewSlots = [message.slice(0, 120)];
  }
  if (/דחוף|מיידי|השבוע/.test(lower)) patch.urgency = message.slice(0, 60);
  if (/הטבות|אוכל|נסיעות|ביטוח/.test(lower)) patch.benefits = message.slice(0, 120);
  if (/לילה/.test(lower)) patch.nightShiftsRequired = /לא.*לילה/.test(lower) ? "לא" : "כן";
  if (/סופ.?שבוע|שישי|שבת/.test(lower)) {
    patch.weekendsRequired = /לא.*סופ/.test(lower) ? "לא" : "כן";
  }
  if (/רכב|רישיון/.test(lower)) patch.transportNeeded = message.slice(0, 80);
  if (/פיזי|הרמה|עמידה/.test(lower)) patch.physicalDemands = message.slice(0, 100);
  if (/קהל|לקוחות/.test(lower)) patch.customerFacing = "כן";
  if (/חברה|עסק|רשת/.test(lower)) patch.companyDescription = message.slice(0, 160);
  if (/קו אדום|לא לקבל|חובה שיהיה/.test(lower)) patch.dealBreakers = message.slice(0, 120);

  return patch;
}

function acknowledge(patch: Record<string, unknown>): string {
  const keys = Object.keys(patch).filter((k) => patch[k] !== undefined && patch[k] !== "");
  if (keys.length === 0) return "קיבלתי.";
  if (keys.length === 1) return "עדכנתי.";
  return `עדכנתי ${keys.length} פרטים.`;
}

export function heuristicEmployeeIntake(
  message: string,
  card: CandidateCard,
  pending: FieldQuestion[],
): IntakeResult {
  const patch = extractCandidatePatch(message, card);
  const fieldAnswers: { questionId: string; answer: string }[] = [];

  if (pending.length && message.trim().length > 5) {
    fieldAnswers.push({ questionId: pending[0].id, answer: message.trim() });
  }

  const nextCard = { ...card, ...patch } as CandidateCard;
  if (patch.skills) nextCard.skills = patch.skills;
  const filled = filledCount(candidateRows(nextCard));
  const total = candidateRows(nextCard).length;
  const missing = nextMissingCandidateField(nextCard);

  if (pending.length && fieldAnswers.length === 0) {
    return {
      reply: `לפני שנמשיך — מעסיקים בתחום שלך שאלו: ${pending[0].question}`,
      candidatePatch: patch,
      fieldAnswers,
      provider: "heuristic",
    };
  }

  let followUp = "אפשר להוסיף עוד פרט שחשוב לך.";
  if (missing) {
    const prompts: Record<string, string> = {
      desiredRole: "איזה תפקיד את/ה מחפש/ת עכשיו?",
      field: "באיזה תחום זה בעיקר?",
      location: "באיזה אזור את/ה מעדיפ/ה לעבוד?",
      experienceYears: "כמה שנות ניסיון רלוונטי יש לך בערך?",
      skills: "אילו כישורים הכי חשובים לציין?",
      personality: "איך היית מתאר/ת את האופי שלך בעבודה?",
      salaryExpectation: "מה ציפיית השכר שלך?",
      interviewAvailability: "מתי נוח לך לראיון השבוע?",
      flexibility:
        "כמה את/ה מוכנ/ה להתפשר על התאמה מדויקת? דרג/י מ-1 (גמיש מאוד) עד 10 (רק מדויק).",
      dealBreakers: "יש משהו שהוא קו אדום מבחינתך?",
      shiftPreference: "יש העדפה למשמרות (בוקר/ערב/לילה)?",
      transportation: "איך את/ה מגיע/ה לעבודה בדרך כלל?",
    };
    followUp = prompts[missing.key] ?? `ספר/י לי עוד על: ${missing.label}.`;
  }

  if (Object.keys(patch).length) {
    patch.summary = [nextCard.desiredRole, nextCard.field, nextCard.location]
      .filter(Boolean)
      .join(" · ");
  }

  return {
    reply: `${acknowledge(patch as Record<string, unknown>)} הכרטיס מולא ב-${filled}/${total} שדות. ${followUp}`,
    candidatePatch: patch,
    fieldAnswers,
    provider: "heuristic",
  };
}

export function heuristicEmployerIntake(message: string, card: JobCard): IntakeResult {
  const patch = extractJobPatch(message, card);
  const nextCard = { ...card, ...patch } as JobCard;
  if (patch.mustHaves) nextCard.mustHaves = patch.mustHaves;
  if (patch.interviewSlots) nextCard.interviewSlots = patch.interviewSlots;

  const filled = filledCount(jobRows(nextCard));
  const total = jobRows(nextCard).length;
  const missing = nextMissingJobField(nextCard);

  const prompts: Record<string, string> = {
    title: "איזה תפקיד את/ה מגייס/ת?",
    field: "מה התחום של המשרה?",
    location: "איפה המיקום?",
    mustHaves: "מה חובה שיהיה למועמד? אפשר לפרט כמה דברים.",
    personalityFit: "איזה אופי ישתלב טוב בצוות?",
    interviewSlots: "מתי את/ה פנוי/ה לראיונות? אפשר כמה חלונות.",
    salaryRange: "מה טווח השכר או התנאים?",
    urgency: "כמה דחוף הגיוס?",
    teamCulture: "איך היית מתאר/ת את האווירה בצוות?",
    dealBreakers: "מה יהיה דיל-ברייקר אצל מועמד?",
    benefits: "יש הטבות חשובות לציין?",
    workModel: "העבודה מהמשרד, היברידית או מרחוק?",
  };

  const followUp = missing
    ? prompts[missing.key] ?? `ספר/י לי עוד על: ${missing.label}.`
    : "הכרטיס כבר עשיר. אפשר להוסיף ניואנסים — ככל שיש יותר מידע, השידוך מדויק יותר.";

  if (Object.keys(patch).length) {
    patch.summary = [nextCard.title, nextCard.field, nextCard.location]
      .filter(Boolean)
      .join(" · ");
  }

  return {
    reply: `${acknowledge(patch as Record<string, unknown>)} כרטיס המשרה מולא ב-${filled}/${total} שדות. ${followUp}`,
    jobPatch: patch,
    provider: "heuristic",
  };
}
