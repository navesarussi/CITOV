import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseJobWorkspaces,
  pickJobWorkspace,
  upsertJobWorkspace,
  workspaceSummaries,
} from "./employer-job-workspace";
import { emptyJobCard } from "./types";

describe("employer-job-workspace", () => {
  const slots = [
    {
      id: "j1",
      name: "A",
      card: { ...emptyJobCard(), title: "מלצר" },
      chat: [{ id: "m1", role: "user" as const, content: "hi", createdAt: "t" }],
    },
    {
      id: "j2",
      name: "B",
      card: { ...emptyJobCard(), title: "שף" },
      chat: [],
    },
  ];

  it("picks a workspace by id", () => {
    const hit = pickJobWorkspace(slots, "j2");
    assert.equal(hit?.card.title, "שף");
    assert.equal(pickJobWorkspace(slots, "missing"), null);
  });

  it("summaries omit heavy chat payloads", () => {
    const summaries = workspaceSummaries(slots);
    assert.deepEqual(summaries, [
      { id: "j1", name: "A", title: "מלצר", field: "" },
      { id: "j2", name: "B", title: "שף", field: "" },
    ]);
  });

  it("upserts card/chat on the active workspace", () => {
    const next = upsertJobWorkspace(slots, "j1", {
      card: { ...emptyJobCard(), title: "ברמן" },
      chat: [{ id: "m2", role: "assistant", content: "ok", createdAt: "t" }],
    });
    assert.equal(next[0]!.card.title, "ברמן");
    assert.equal(next[0]!.chat.length, 1);
    assert.equal(next[1]!.card.title, "שף");
  });

  it("parses API job payloads into workspaces", () => {
    const parsed = parseJobWorkspaces([
      {
        id: "j9",
        name: "X",
        card: { ...emptyJobCard(), title: "קופאי" },
        chat: [{ id: "c", role: "user", content: "hey", createdAt: "t" }],
      },
    ]);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]!.card.title, "קופאי");
    assert.equal(parsed[0]!.chat[0]!.content, "hey");
  });

  it("renames a workspace locally without touching chat", () => {
    const next = upsertJobWorkspace(slots, "j1", { name: "סניף חדש" });
    assert.equal(next[0]!.name, "סניף חדש");
    assert.equal(next[0]!.chat.length, 1);
    assert.equal(next[0]!.card.title, "מלצר");
  });
});
