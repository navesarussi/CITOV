import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyCandidateCard } from "@/domain/types";
import { hasGeminiKey } from "./gemini-client";
import { runCvExtraction } from "./cv-extraction";

describe("runCvExtraction", () => {
  it("returns failed without writing heuristic junk when Gemini unavailable", async () => {
    if (hasGeminiKey()) return;
    const out = await runCvExtraction({
      text: "נועה כהן, טלפון 050-1234567, מחפשת עבודה כמלצרית",
      card: emptyCandidateCard(),
    });
    assert.equal(out.failed, true);
    assert.deepEqual(out.patch, {});
    assert.equal(out.patch.remotePreference, undefined);
  });
});
