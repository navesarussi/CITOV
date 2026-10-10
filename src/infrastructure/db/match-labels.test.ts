import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

describe("match-labels", () => {
  it("insert SQL does not require labeler_role column", () => {
    const src = readFileSync(join(process.cwd(), "src/infrastructure/db/match-labels.ts"), "utf8");
    assert.match(src, /insert into match_labels/);
    assert.doesNotMatch(src, /labeler_role/);
  });
});
