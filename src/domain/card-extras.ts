import type { CandidateCard, JobCard } from "./types";

export type CardRow = {
  key: string;
  label: string;
  value: string;
  filled: boolean;
  dynamic?: boolean;
};

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "number") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

export function formatCardValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (typeof value[0] === "object" && value[0] !== null) {
      const first = value[0] as Record<string, unknown>;
      if ("company" in first || "title" in first) {
        return `${value.length} תפקידים`;
      }
      if ("institution" in first || "degreeOrProgram" in first) {
        return `${value.length} רשומות השכלה`;
      }
      return `${value.length} פריטים`;
    }
    return value.join(", ");
  }
  if (typeof value === "number") return String(value);
  return String(value);
}

export function extrasRows(
  extras: Record<string, string> | undefined,
  labels: Record<string, string> = {},
): CardRow[] {
  if (!extras) return [];
  return Object.entries(extras)
    .filter(([, value]) => !isEmpty(value))
    .map(([key, value]) => ({
      key: `extras.${key}`,
      label: labels[key] ?? key,
      value: formatCardValue(value),
      filled: true,
      dynamic: true,
    }));
}

export function mergeCardRows(core: CardRow[], extras: Record<string, string> | undefined): CardRow[] {
  return [...core, ...extrasRows(extras)];
}

export function cardValue(card: CandidateCard | JobCard, key: string): unknown {
  return (card as Record<string, unknown>)[key];
}
