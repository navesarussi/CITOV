import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSandboxStore, sandboxHoldoutPairKeys } from "../../eval/test-sandbox/generate-dataset";
import { filterProductionStore } from "@/infrastructure/db/store-scope";

describe("test-sandbox", () => {
  it("generates 150 jobs and candidates", () => {
    const store = buildSandboxStore();
    assert.equal(store.employees.length, 150);
    const jobs = store.employers.reduce((n, e) => n + e.jobs.length, 0);
    assert.equal(jobs, 150);
  });

  it("production filter removes sandbox entities", () => {
    const store = buildSandboxStore();
    const prod = filterProductionStore(store);
    assert.equal(prod.users.length, 0);
    assert.equal(prod.matches.length, 0);
  });

  it("reserves holdout pairs", () => {
    assert.equal(sandboxHoldoutPairKeys().size, 20);
  });
});
