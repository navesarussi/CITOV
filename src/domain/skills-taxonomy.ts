/** Canonical skill tokens + HE/EN aliases and skill→family mapping for rule overlap. */

export type SkillFamily =
  | "frontend"
  | "backend"
  | "mobile"
  | "devops"
  | "data"
  | "security"
  | "general";

function normToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Alias → canonical English skill id. */
const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  "ג'אווה סקריפט": "javascript",
  "ג javascript": "javascript",
  "java script": "javascript",
  ts: "typescript",
  typescript: "typescript",
  "טייפסקריפט": "typescript",
  react: "react",
  "ריאקט": "react",
  reactjs: "react",
  "react.js": "react",
  node: "nodejs",
  nodejs: "nodejs",
  "node.js": "nodejs",
  python: "python",
  "פייתון": "python",
  java: "java",
  "ג'אווה": "java",
  docker: "docker",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
  aws: "aws",
  postgres: "postgresql",
  postgresql: "postgresql",
  sql: "sql",
  html: "html",
  css: "css",
  kafka: "kafka",
  microservices: "microservices",
  "מיקרו-שירותים": "microservices",
  apis: "apis",
  api: "apis",
  ios: "ios",
  android: "android",
  swift: "swift",
  kotlin: "kotlin",
  "שירות לקוחות": "customer service",
  "customer service": "customer service",
  crm: "crm",
  agile: "agile",
  scrum: "scrum",
  jira: "jira",
  "ניהול מטבח": "kitchen management",
  "kitchen management": "kitchen management",
  cocktails: "cocktails",
  קוקטיילים: "cocktails",
  "manual testing": "manual testing",
  "בדיקות ידניות": "manual testing",
  sales: "sales",
  מכירות: "sales",
  "digital marketing": "digital marketing",
  "שיווק דיגיטלי": "digital marketing",
  recruitment: "recruitment",
  גיוס: "recruitment",
  "patient care": "patient care",
  "טיפול בחולים": "patient care",
  "driving license": "driving license",
  "רישיון נהיגה": "driving license",
  "shift work": "shift work",
  משמרות: "shift work",
};

export const SKILL_TO_FAMILY: Record<string, SkillFamily> = {
  javascript: "frontend",
  typescript: "frontend",
  react: "frontend",
  html: "frontend",
  css: "frontend",
  nodejs: "backend",
  python: "backend",
  java: "backend",
  apis: "backend",
  microservices: "backend",
  kafka: "backend",
  postgresql: "backend",
  sql: "backend",
  docker: "devops",
  kubernetes: "devops",
  aws: "devops",
  ios: "mobile",
  android: "mobile",
  swift: "mobile",
  kotlin: "mobile",
};

export function canonicalizeSkillToken(text: string): string {
  const n = normToken(text);
  if (!n) return text;
  return SKILL_ALIASES[n] ?? n;
}

/** Tokens used for rule overlap (canonical + raw + family). */
export function skillTokensForOverlap(rawSkills: string[]): string[] {
  const out = new Set<string>();
  for (const raw of rawSkills) {
    const n = normToken(raw);
    if (!n) continue;
    out.add(n);
    const canon = canonicalizeSkillToken(raw);
    out.add(normToken(canon));
    const family = SKILL_TO_FAMILY[canon];
    if (family) out.add(family);
  }
  return [...out];
}

export function canonicalizeSkillList(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    const canon = canonicalizeSkillToken(s);
    const key = normToken(canon);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(canon);
  }
  return out;
}

export function skillFamiliesFromSkills(skills: string[]): SkillFamily[] {
  const fam = new Set<SkillFamily>();
  for (const s of canonicalizeSkillList(skills)) {
    const f = SKILL_TO_FAMILY[normToken(s)];
    if (f) fam.add(f);
  }
  return [...fam];
}
