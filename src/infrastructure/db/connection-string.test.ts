import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDatabaseUrl,
  parseDatabaseUrl,
  poolerConnectionCandidates,
  toPoolerConnectionString,
} from "./connection-string";

describe("connection-string", () => {
  it("parses passwords with reserved characters", () => {
    const parsed = parseDatabaseUrl(
      "postgresql://postgres:p%40ss%2Fword@db.abc123xyz.supabase.co:5432/postgres",
    );
    assert.equal(parsed.password, "p@ss/word");
    assert.equal(parsed.ref, "abc123xyz");
  });

  it("rewrites direct supabase db host to pooler", () => {
    const input =
      "postgresql://postgres:secret@db.abc123xyz.supabase.co:5432/postgres";
    const out = toPoolerConnectionString(input, "us-east-1");
    assert.match(out, /aws-0-us-east-1\.pooler\.supabase\.com:6543/);
  });

  it("builds a compact candidate list with original URL first", () => {
    const input =
      "postgresql://postgres:secret@db.abc123xyz.supabase.co:5432/postgres";
    const candidates = poolerConnectionCandidates(input);
    assert.equal(candidates[0], input);
    assert.ok(candidates.length > 8 && candidates.length < 50);
    assert.ok(candidates.some((c) => c.includes("aws-0-us-east-1.pooler.supabase.com:6543")));
    assert.ok(candidates.some((c) => c.includes(":5432/") && c.includes("pooler")));
  });

  it("round-trips buildDatabaseUrl", () => {
    const url = buildDatabaseUrl({
      user: "postgres.ref",
      password: "a@b/c",
      host: "aws-0-us-east-1.pooler.supabase.com",
      port: 6543,
      database: "postgres",
    });
    const parsed = parseDatabaseUrl(url);
    assert.equal(parsed.password, "a@b/c");
  });
});
