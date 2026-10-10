/** Strip phone/email from public job/candidate card fields (on-platform contact only). */

const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Israeli mobiles (05x) and common landline patterns; optional +972 / separators. */
const IL_PHONE_PATTERN =
  /(?:\+972|972)[\s.-]?(?:0)?(?:5[0-9]|[23489])[\s.-]?\d{3}[\s.-]?\d{4}|(?:^|[^\d])0(?:5[0-9]|[23489])[\s.-]?\d{3}[\s.-]?\d{4}(?:[^\d]|$)/g;

const JOB_CONTACT_KEYS = new Set(["contactName", "contactPhone"]);

export type ContactSanitizeResult<T> = {
  value: T;
  strippedFromPatch: boolean;
};

export function stripContactFromPublicString(text: string): { text: string; changed: boolean } {
  let changed = false;
  let out = text;
  for (const pattern of [EMAIL_PATTERN, IL_PHONE_PATTERN]) {
    const next = out.replace(pattern, () => {
      changed = true;
      return "";
    });
    out = next;
  }
  out = out.replace(/\s{2,}/g, " ").trim();
  if (out !== text.trim()) changed = true;
  return { text: out, changed };
}

export function messageContainsContactInfo(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  EMAIL_PATTERN.lastIndex = 0;
  IL_PHONE_PATTERN.lastIndex = 0;
  return EMAIL_PATTERN.test(t) || IL_PHONE_PATTERN.test(t);
}

/** Agent reply asks user to share phone/email or promises off-platform handoff. */
export function replyRequestsContactDetails(reply: string): boolean {
  const t = reply.trim();
  if (!t) return false;
  const askPatterns = [
    /מספר\s+טלפון/i,
    /טלפון\s+(?:ליצירת\s+קשר|שלך|שלכם)/i,
    /what(?:'s| is)\s+your\s+(?:phone|email)/i,
    /(?:phone|email)\s+(?:number|address)/i,
    /כתובת\s+(?:מייל|אימייל|דוא["']?ל)/i,
    /אימייל\s+(?:שלך|שלכם)/i,
    /דוא["']?ל\s+(?:שלך|שלכם)/i,
    /שם\s+(?:וא|\+)\s*(?:טלפון|מספר)/i,
    /contactName|contactPhone/i,
    /(?:אעביר|נעביר|אשלח).{0,40}(?:פרטים|טלפון|אימייל)/i,
    /(?:יתקשרו|תתקשרו|לחייג).{0,30}(?:אליך|אליכם)/i,
  ];
  return askPatterns.some((re) => re.test(t));
}

export const PLATFORM_CONTACT_NOTICE_HE =
  "יצירת קשר מתבצעת דרך הפלטפורמה — פרטים נחשפים רק לאחר אישור הדדי. לא שומרים טלפון או אימייל בכרטיס הציבורי.";

export function maybeAppendPlatformContactNotice(
  reply: string,
  opts: {
    userMessage?: string;
    strippedFromPatch?: boolean;
  },
): string {
  const needs =
    opts.strippedFromPatch ||
    (opts.userMessage && messageContainsContactInfo(opts.userMessage)) ||
    replyRequestsContactDetails(reply);
  if (!needs) return reply;
  if (reply.includes(PLATFORM_CONTACT_NOTICE_HE)) return reply;
  return `${reply.trim()}\n\n${PLATFORM_CONTACT_NOTICE_HE}`;
}

function sanitizeStringField(value: unknown): { value: string | undefined; changed: boolean } {
  if (typeof value !== "string") return { value: undefined, changed: false };
  const trimmed = value.trim();
  if (!trimmed) return { value: undefined, changed: false };
  const { text, changed } = stripContactFromPublicString(trimmed);
  if (!text) return { value: undefined, changed: true };
  return { value: text, changed };
}

function sanitizePatchRecord(
  patch: Record<string, unknown> | undefined,
  options: { dropJobContactKeys: boolean },
): ContactSanitizeResult<Record<string, unknown> | undefined> {
  if (!patch) return { value: undefined, strippedFromPatch: false };
  let strippedFromPatch = false;
  const out: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(patch)) {
    if (raw === undefined) continue;
    if (options.dropJobContactKeys && JOB_CONTACT_KEYS.has(key)) {
      strippedFromPatch = true;
      continue;
    }
    if (key === "skills" || key === "softSkills" || key === "languages" || key === "techStack") {
      if (!Array.isArray(raw)) continue;
      const list: string[] = [];
      for (const item of raw) {
        const cleaned = sanitizeStringField(item);
        if (cleaned.changed) strippedFromPatch = true;
        if (cleaned.value) list.push(cleaned.value);
      }
      if (list.length) out[key] = list;
      continue;
    }
    if (
      key === "mustHaves" ||
      key === "niceToHaves" ||
      key === "requiredLanguages" ||
      key === "interviewSlots"
    ) {
      if (!Array.isArray(raw)) continue;
      const list: string[] = [];
      for (const item of raw) {
        const cleaned = sanitizeStringField(item);
        if (cleaned.changed) strippedFromPatch = true;
        if (cleaned.value) list.push(cleaned.value);
      }
      if (list.length) out[key] = list;
      continue;
    }
    if (key === "extras" && raw && typeof raw === "object") {
      const extras: Record<string, string> = {};
      for (const [ek, ev] of Object.entries(raw as Record<string, unknown>)) {
        const cleaned = sanitizeStringField(ev);
        if (cleaned.changed) strippedFromPatch = true;
        if (cleaned.value) extras[ek] = cleaned.value;
      }
      if (Object.keys(extras).length) out.extras = extras;
      continue;
    }
    if (key === "flexibility" || key === "experienceYears") {
      if (typeof raw === "number") out[key] = raw;
      continue;
    }
    if (key === "matchCanonical" && raw && typeof raw === "object") {
      out[key] = raw;
      continue;
    }
    const cleaned = sanitizeStringField(raw);
    if (cleaned.changed) strippedFromPatch = true;
    if (cleaned.value !== undefined) out[key] = cleaned.value;
  }

  return {
    value: Object.keys(out).length ? out : undefined,
    strippedFromPatch,
  };
}

export function sanitizeJobPatch<T extends Record<string, unknown>>(
  patch: T | undefined,
): ContactSanitizeResult<T | undefined> {
  const r = sanitizePatchRecord(patch as Record<string, unknown> | undefined, {
    dropJobContactKeys: true,
  });
  return { value: r.value as T | undefined, strippedFromPatch: r.strippedFromPatch };
}

export function sanitizeCandidatePatch<T extends Record<string, unknown>>(
  patch: T | undefined,
): ContactSanitizeResult<T | undefined> {
  const r = sanitizePatchRecord(patch as Record<string, unknown> | undefined, {
    dropJobContactKeys: false,
  });
  return { value: r.value as T | undefined, strippedFromPatch: r.strippedFromPatch };
}

/** Redact contact info from arbitrary string map (e.g. CV extraction patch). */
export function redactContactFromRecord(
  patch: Record<string, unknown>,
): { patch: Record<string, unknown>; strippedCount: number } {
  const r = sanitizePatchRecord(patch, { dropJobContactKeys: true });
  const strippedCount = r.strippedFromPatch ? 1 : 0;
  return { patch: r.value ?? {}, strippedCount };
}
