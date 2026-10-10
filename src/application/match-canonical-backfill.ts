import { inferMatchCanonicalFromText, mergeMatchCanonical } from "@/domain/match-canonical";
import type { StoreData } from "@/domain/types";

/** Ensure rule matching uses English canonical tokens for Hebrew display fields. */
export function backfillMatchCanonicalOnStore(store: StoreData): StoreData {
  const employees = store.employees.map((e) => {
    const inferred = inferMatchCanonicalFromText(e.card);
    if (!inferred) return e;
    return { ...e, card: mergeMatchCanonical(e.card, inferred) };
  });
  const employers = store.employers.map((er) => ({
    ...er,
    card: mergeMatchCanonical(
      er.card,
      inferMatchCanonicalFromText(er.card) ?? undefined,
    ),
    jobs: (er.jobs ?? []).map((j) => ({
      ...j,
      card: mergeMatchCanonical(
        j.card,
        inferMatchCanonicalFromText(j.card) ?? undefined,
      ),
    })),
  }));
  return { ...store, employees, employers };
}
