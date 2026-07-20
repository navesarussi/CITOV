import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { poolerConnectionCandidates, toPoolerConnectionString } from "./connection-string";

describe("toPoolerConnectionString", () => {
  it("rewrites direct supabase db host to pooler", () => {
    const input =
      "postgresql://postgres:secret@db.abc123xyz.supabase.co:5432/postgres";
    const out = toPoolerConnectionString(input, "us-east-1");
    assert.match(out, /aws-0-us-east-1\.pooler\.supabase\.com:6543/);
  });

  it("builds multiple pooler host candidates", () => {
    const input =
      "postgresql://postgres:secret@db.abc123xyz.supabase.co:5432/postgres";
    const candidates = poolerConnectionCandidates(input);
    assert.ok(candidates.length > 1);
    assert.ok(candidates.some((c) => c.includes("aws-1-us-east-1.pooler.supabase.com:6543")));
  });
});
