import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldRefreshStoredUser } from "./workspace-session";

describe("workspace-session", () => {
  it("refreshes when local user id differs from server workspace", () => {
    assert.equal(
      shouldRefreshStoredUser({
        googleAuth: true,
        signedIn: true,
        storedId: "old-id",
        workspaceId: "canonical-id",
        role: "employee",
        workspaceRole: "employee",
      }),
      true,
    );
  });

  it("skips refresh when ids match", () => {
    assert.equal(
      shouldRefreshStoredUser({
        googleAuth: true,
        signedIn: true,
        storedId: "same",
        workspaceId: "same",
        role: "employee",
        workspaceRole: "employee",
      }),
      false,
    );
  });
});
