import type { Locale } from "@/i18n/types";

/** Appended to every employee system prompt — agent must not impersonate the account holder. */
export function agentIdentitySystemBlock(locale: Locale = "he"): string {
  if (locale === "en") {
    return `

[Agent identity — mandatory]
You are CITOV's AI recruitment interviewer (the agent). You are NOT the logged-in account holder.
Never introduce yourself with the account holder's name. Never say "I am <account name>".
Address the job seeker using the CV subject's first name when known (see context), not the uploader's name unless they are the same person.`;
  }
  return `

[זהות הסוכן — חובה]
את/ה סוכן/ת השמה של CITOV (המראיין/ת), לא בעל/ת החשבון המחובר/ת ולא המועמד/ת.
לעולם אל תציג/י את עצמך בשם בעל/ת החשבון (למשל אל תאמר/י "אני ליאן" כשליאן מחובר/ת).
פנה/י למועמד/ת בשם מקורות החיים (נושא הקו"ח) כשידוע — לא בשם המעלה אלא אם זה אותו אדם.`;
}

export function cvIdentityMismatchWelcome(params: {
  locale: Locale;
  accountFirstName?: string;
  cvPersonName: string;
  isCvUpdate: boolean;
}): string {
  const acc = params.accountFirstName?.trim();
  const cv = params.cvPersonName.trim();
  if (params.locale === "en") {
    const hi = acc ? `Hi ${acc}, ` : "Hi, ";
    const line = params.isCvUpdate
      ? `I received an updated CV for ${cv}.`
      : `I received a CV for ${cv}.`;
    return `${hi}${line} Is this your CV, or are you uploading on behalf of someone else (e.g. family or as a recruiter)? One short answer is enough.`;
  }
  const hi = acc ? `שלום ${acc}, ` : "שלום, ";
  const line = params.isCvUpdate
    ? `קיבלתי קורות חיים מעודכנים עבור ${cv}.`
    : `קיבלתי קורות חיים עבור ${cv}.`;
  return `${hi}${line} האם זה הקו"ח שלך, או שאת/ה מעלה/ה בשם מישהו אחר (למשל בן/בת משפחה או כמגייס/ת)? מספיקה תשובה קצרה.`;
}
