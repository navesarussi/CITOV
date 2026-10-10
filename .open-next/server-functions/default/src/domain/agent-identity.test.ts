import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { agentIdentitySystemBlock, cvIdentityMismatchWelcome } from "./agent-identity";

describe("agent-identity", () => {
  it("forbids using account name as agent persona in system block", () => {
    assert.match(agentIdentitySystemBlock("he"), /אל תציג/);
    assert.match(agentIdentitySystemBlock("he"), /בעל\/ת החשבון/);
  });

  it("identity mismatch welcome addresses account holder not CV subject as self", () => {
    const msg = cvIdentityMismatchWelcome({
      locale: "he",
      accountFirstName: "ליאן",
      cvPersonName: "Nave Sarussi",
      isCvUpdate: false,
    });
    assert.match(msg, /שלום ליאן/);
    assert.match(msg, /Nave Sarussi/);
    assert.doesNotMatch(msg, /אני ליאן/);
    assert.doesNotMatch(msg, /היי נווה.*אני ליאן/);
  });
});
