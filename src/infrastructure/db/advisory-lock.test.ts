import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runUnderXactAdvisoryLock } from "./normalized-store";

function fakeClient(lock: { held: boolean; waiters: (() => void)[] }, log: string[]) {
  return {
    async query(sql: string) {
      log.push(sql);
      if (sql.includes("pg_advisory_xact_lock")) {
        while (lock.held) await new Promise<void>((r) => lock.waiters.push(r));
        lock.held = true;
      }
      if (sql === "commit" || sql === "rollback") {
        lock.held = false;
        lock.waiters.splice(0).forEach((w) => w());
      }
    },
    release() {},
  };
}

describe("runUnderXactAdvisoryLock", () => {
  it("serializes parallel rebuilds and keeps a stable match set", async () => {
    const lock = { held: false, waiters: [] as (() => void)[] };
    const log: string[] = [];
    let matches: string[] = ["a"];
    let active = 0;
    let maxActive = 0;
    const rebuild = () =>
      runUnderXactAdvisoryLock(fakeClient(lock, log), 1, async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        const snap = [...matches];
        await new Promise((r) => setTimeout(r, 5));
        matches = [...new Set([...snap, "b"])];
        active--;
      });
    await Promise.all(Array.from({ length: 5 }, rebuild));
    assert.equal(maxActive, 1);
    assert.deepEqual(matches, ["a", "b"]);
    assert.equal(log.filter((q) => q.includes("xact_lock")).length, 5);
  });

  it("rolls back and releases the lock on failure", async () => {
    const lock = { held: false, waiters: [] as (() => void)[] };
    const log: string[] = [];
    await assert.rejects(
      runUnderXactAdvisoryLock(fakeClient(lock, log), 1, async () => {
        throw new Error("boom");
      }),
      /boom/,
    );
    assert.ok(log.includes("rollback"));
    assert.equal(lock.held, false);
  });
});
