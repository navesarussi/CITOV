import {
  approveMatch,
  askFieldQuestion,
  rejectMatch,
} from "@/application/employer-actions";
import { ok, fail } from "@/infrastructure/http";
import { readStore, writeStore } from "@/infrastructure/store";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      employerId?: string;
      matchId?: string;
      action?: "approve" | "reject" | "ask";
      question?: string;
    };

    if (!body.employerId || !body.matchId || !body.action) {
      return ok({ error: "חסרים פרטים" }, { status: 400 });
    }

    let store = await readStore();
    if (body.action === "approve") {
      store = approveMatch(store, body.matchId);
    } else if (body.action === "reject") {
      store = rejectMatch(store, body.matchId);
    } else {
      store = askFieldQuestion(store, {
        employerId: body.employerId,
        matchId: body.matchId,
        question: body.question ?? "",
      });
    }

    await writeStore(store);
    return ok({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
