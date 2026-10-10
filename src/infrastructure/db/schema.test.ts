import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

describe("ensureSchema", () => {
  it("always applies idempotent ALTERS even when base schema exists", () => {
    const src = readFileSync(join(process.cwd(), "src/infrastructure/db/schema.ts"), "utf8");
    assert.match(src, /await pool\.query\(ALTERS\)/);
    assert.doesNotMatch(src, /schemaAlreadyCurrent\(pool\)\)[\s\S]*return;/);
    assert.match(src, /labeler_role/);
    assert.match(src, /match_queue_threshold/);
  });
});
