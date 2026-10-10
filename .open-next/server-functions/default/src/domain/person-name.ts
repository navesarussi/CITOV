/** Normalize for fuzzy person-name comparison (Hebrew + Latin). */
export function normalizePersonName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, "")
    .replace(/[^a-z\u0590-\u05ffa-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TRANSLIT: Record<string, string> = {
  lian: "lian",
  liyan: "lian",
  liann: "lian",
  nave: "nave",
  nava: "nave",
  noa: "noa",
  noah: "noa",
};

function tokens(name: string): string[] {
  return normalizePersonName(name)
    .split(" ")
    .filter(Boolean)
    .map((t) => TRANSLIT[t] ?? t);
}

/** True when names likely refer to the same person (not strict ID). */
export function namesLikelySamePerson(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return true;
  const setB = new Set(tb);
  const overlap = ta.filter((t) => setB.has(t)).length;
  if (overlap >= 1 && (ta.length <= 2 || tb.length <= 2)) {
    return overlap >= Math.min(ta.length, tb.length);
  }
  if (ta.join(" ") === tb.join(" ")) return true;
  const firstA = ta[0];
  const firstB = tb[0];
  if (firstA && firstB && firstA === firstB && overlap >= 1) return true;
  return false;
}

export function firstNameFromFullName(full: string): string | undefined {
  const t = full.trim().split(/[\s(]/)[0]?.trim();
  return t || undefined;
}

export function personNameFromCvFileName(fileName: string): string | null {
  const base = fileName.replace(/\.[^.]+$/, "");
  const m = base.match(/cv[-_ ]?(.+)/i);
  if (!m?.[1]) return null;
  const part = m[1].replace(/[-_]+/g, " ").trim();
  if (part.length < 2) return null;
  const words = part.split(/\s+/).filter(Boolean);
  const stop = words.findIndex((w) => /^(low|level|en|he|cv)$/i.test(w));
  const slice = stop > 0 ? words.slice(0, stop) : words.slice(0, 3);
  return slice
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function extractCvPersonName(params: {
  subjectFullName?: string | null;
  summary?: string | null;
  workHistory?: { title?: string; company?: string }[];
  fileName?: string | null;
}): string | null {
  const fromField = params.subjectFullName?.trim();
  if (fromField && fromField.length >= 2) return fromField;
  const fromFile = params.fileName ? personNameFromCvFileName(params.fileName) : null;
  if (fromFile) return fromFile;
  return null;
}
