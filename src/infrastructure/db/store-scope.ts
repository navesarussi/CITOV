import {
  matchIsTestRow,
  type AdminDataScope,
  userIsTestRow,
} from "@/domain/test-sandbox";
import type { StoreData } from "@/domain/types";

export function filterStoreByScope(store: StoreData, scope: AdminDataScope): StoreData {
  if (scope === "test") {
    const users = store.users.filter((u) => userIsTestRow(u));
    const ids = new Set(users.map((u) => u.id));
    return {
      ...store,
      users,
      employees: store.employees.filter((e) => ids.has(e.userId)),
      employers: store.employers.filter((e) => ids.has(e.userId)),
      matches: store.matches.filter((m) => matchIsTestRow(m)),
    };
  }
  return filterProductionStore(store);
}

/** Real users, jobs, and matches only — used for candidate/employer flows and production rebuild. */
export function filterProductionStore(store: StoreData): StoreData {
  const users = store.users.filter((u) => !userIsTestRow(u));
  const ids = new Set(users.map((u) => u.id));
  return {
    ...store,
    users,
    employees: store.employees.filter((e) => ids.has(e.userId)),
    employers: store.employers.filter((e) => ids.has(e.userId)),
    matches: store.matches.filter((m) => !matchIsTestRow(m)),
  };
}
