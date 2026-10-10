import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sessionOwnsUser } from "./session-ownership";

describe("session-ownership", () => {
  it("matches normalized email", () => {
    assert.equal(
      sessionOwnsUser({
        sessionEmail: "Admin@Example.com",
        userEmail: "admin@example.com",
      }),
      true,
    );
  });

  it("matches google id", () => {
    assert.equal(
      sessionOwnsUser({
        sessionGoogleId: "gid-1",
        userGoogleId: "gid-1",
      }),
      true,
    );
  });

  it("rejects unrelated user", () => {
    assert.equal(
      sessionOwnsUser({
        sessionEmail: "a@b.com",
        userEmail: "c@d.com",
      }),
      false,
    );
  });
});
