import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Patterns that must not appear as affirmative instructions in chat prompts. */
export const FORBIDDEN_CONTACT_PROMPT_PATTERNS: { id: string; re: RegExp }[] = [
  {
    id: "save_contact_fields",
    re: /שמור[^\n]{0,40}(?:contactName|contactPhone)/i,
  },
  {
    id: "ask_contact_collect",
    re: /בקש[^\n]{0,50}(?:טלפון|אימייל|איש קשר לגיוס)/i,
  },
  {
    id: "forward_promise_he",
    re: /(?:^|[^\u0591-\u05C7])(?:אעביר|נעביר|אשלח)[^\n]{0,40}(?:פרטים|טלפון|אימייל)/i,
  },
  {
    id: "call_promise_he",
    re: /(?:^|[^\u0591-\u05C7])(?:יתקשרו|תתקשר)[^\n]{0,30}(?:אליך|אליכם)/i,
  },
  { id: "ask_phone_en", re: /what(?:'s| is) your (?:phone|email)/i },
];

/** Drop lines that explicitly forbid an action (אל / לא). */
export function stripProhibitionLines(body: string): string {
  return body
    .split("\n")
    .filter((line) => !/(?:^|\*\*)אל\s+(?:ת)?(?:בקש|שמור|תכלול|תבטיח)/.test(line))
    .filter((line) => !/^-\s+\*\*אל/.test(line.trim()))
    .join("\n");
}

export type PromptContactPolicyViolation = {
  prompt: "employer" | "candidate";
  patternId: string;
  excerpt: string;
};

function readChatPrompt(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

export function checkChatPromptContactPolicy(): PromptContactPolicyViolation[] {
  const files: { prompt: "employer" | "candidate"; path: string }[] = [
    { prompt: "employer", path: "prompts/employer/system-prompt.md" },
    { prompt: "candidate", path: "prompts/candidate/system-prompt.md" },
  ];
  const violations: PromptContactPolicyViolation[] = [];
  for (const { prompt, path } of files) {
    const body = stripProhibitionLines(readChatPrompt(path));
    for (const { id, re } of FORBIDDEN_CONTACT_PROMPT_PATTERNS) {
      const m = body.match(re);
      if (m) {
        violations.push({
          prompt,
          patternId: id,
          excerpt: m[0].slice(0, 80),
        });
      }
    }
  }
  return violations;
}
