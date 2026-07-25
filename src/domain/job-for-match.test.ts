import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jobCardForMatch } from "./job-for-match";
import { emptyJobCard } from "./types";

describe("job-for-match", () => {
  it("returns the matched job card, not the active job mirror", () => {
    const employer = {
      userId: "er1",
      activeJobId: "job-a",
      card: { ...emptyJobCard(), title: "Active A", contactName: "A", contactPhone: "1" },
      chat: [],
      jobs: [
        {
          id: "job-a",
          card: { ...emptyJobCard(), title: "Active A", contactName: "A", contactPhone: "1" },
          chat: [],
        },
        {
          id: "job-b",
          card: {
            ...emptyJobCard(),
            title: "Approved B",
            contactName: "Dana",
            contactPhone: "050-0000000",
          },
          chat: [],
        },
      ],
    };
    const card = jobCardForMatch(employer, "job-b");
    assert.equal(card?.title, "Approved B");
    assert.equal(card?.contactName, "Dana");
    assert.equal(card?.contactPhone, "050-0000000");
  });
});
