import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { heuristicEmployeeIntake, heuristicEmployerIntake } from "./heuristic";
import { emptyCandidateCard, emptyJobCard, type ChatMessage } from "@/domain/types";

function msg(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: "1", role, content, createdAt: new Date().toISOString() };
}

describe("heuristic intake voice", () => {
  it("does not mention field fill counts (FR-CHAT-01)", () => {
    const card = emptyCandidateCard();
    const result = heuristicEmployeeIntake("היי תעזור לי למצוא עבודה", card, []);
    assert.equal(/מולא ב-\d+\/\d+|שדות|כרטיס/.test(result.reply), false);
  });

  it("maps מכירות to role+field and does not re-ask the same question", () => {
    const card = emptyCandidateCard();
    const first = heuristicEmployeeIntake("היי", card, []);
    assert.match(first.reply, /תפקיד|מחפש/);

    const afterSales = heuristicEmployeeIntake(
      "מכירות",
      { ...card, ...first.candidatePatch } as typeof card,
      [],
      [msg("user", "היי"), msg("assistant", first.reply), msg("user", "מכירות")],
    );
    assert.equal(afterSales.candidatePatch?.desiredRole, "מכירות");
    assert.equal(afterSales.candidatePatch?.field, "מכירות");
    assert.equal(/תפקיד מדבר אליך|איזה תפקיד את\/ה מחפש/.test(afterSales.reply), false);
    assert.match(afterSales.reply, /אזור|תחום|חזק|עצמך|משמרות|שכר|קו אדום|עוד משהו/);
  });

  it("employer replies stay natural without card meta", () => {
    const result = heuristicEmployerIntake("מחפש מלצר למסעדה בתל אביב", emptyJobCard());
    assert.equal(/מולא ב-\d+\/\d+|שדות/.test(result.reply), false);
    assert.ok(result.jobPatch?.title || result.jobPatch?.field);
  });
});
