import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeedStore } from "./memory-store";
import { writeNormalizedStore } from "./normalized-store";

describe("full store write guard", () => {
  it("blocks writeNormalizedStore without ALLOW_FULL_STORE_WRITE", async () => {
    const prev = process.env.ALLOW_FULL_STORE_WRITE;
    const prevDb = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://u:p@localhost:5432/x";
    delete process.env.ALLOW_FULL_STORE_WRITE;
    try {
      await assert.rejects(
        () => writeNormalizedStore(createSeedStore()),
        /Full store write blocked/,
      );
    } finally {
      if (prev === undefined) delete process.env.ALLOW_FULL_STORE_WRITE;
      else process.env.ALLOW_FULL_STORE_WRITE = prev;
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
    }
  });
});
