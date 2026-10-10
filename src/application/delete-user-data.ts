import { NotFoundError } from "@/domain/errors";
import { isNonProductionUserId } from "@/domain/test-sandbox";
import { shouldUseMemoryStore } from "@/infrastructure/db/memory-store";
import { readMemoryStore, writeMemoryStore } from "@/infrastructure/db/memory-store";
import { ensureSchema } from "@/infrastructure/db/schema";
import { getPool } from "@/infrastructure/db/pool";

export async function deleteUserAccountData(userId: string): Promise<void> {
  if (isNonProductionUserId(userId)) {
    throw new NotFoundError("User");
  }
  if (shouldUseMemoryStore()) {
    const all = readMemoryStore();
    writeMemoryStore({
      ...all,
      users: all.users.filter((u) => u.id !== userId),
      employees: all.employees.filter((e) => e.userId !== userId),
      employers: all.employers.filter((e) => e.userId !== userId),
      matches: all.matches.filter(
        (m) => m.candidateId !== userId && m.jobOwnerId !== userId,
      ),
    });
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  await pool.query(`delete from app_users where id = $1 and coalesce(is_test, false) = false`, [
    userId,
  ]);
}
