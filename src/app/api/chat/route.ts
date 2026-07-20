import { after } from "next/server";
import { handleEmployeeChat, handleEmployerChat } from "@/application/chat";
import { refreshStoreMatches } from "@/application/employer-actions";
import { ok, fail } from "@/infrastructure/http";
import { assertActor } from "@/infrastructure/auth-guard";
import { readStore, writeStore } from "@/infrastructure/store";
import { hasGeminiKey } from "@/infrastructure/ai/schemas";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      role?: "employee" | "employer";
      message?: string;
    };
    if (!body.userId || !body.message?.trim()) {
      return ok({ error: "חסרים פרטים" }, { status: 400 });
    }
    const gate = await assertActor(body.userId);
    if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

    const store = await readStore();
    const user = store.users.find((u) => u.id === body.userId);
    if (!user) return ok({ error: "משתמש לא נמצא" }, { status: 404 });

    // Always use the active session role — never trust a stale client role
    // (fixes chat bleed when switching candidate ↔ employer).
    const role = user.role;
    if (body.role && body.role !== role) {
      return ok(
        { error: "התפקיד לא תואם לסשן הפעיל. חזרו למסך הכניסה והתחילו מחדש." },
        { status: 409 },
      );
    }

    const result =
      role === "employee"
        ? await handleEmployeeChat(store, body.userId, body.message.trim())
        : await handleEmployerChat(store, body.userId, body.message.trim());

    await writeStore(result.store);

    // Rebuild matches after the reply is sent — chat latency must not wait on scoring.
    after(async () => {
      try {
        const latest = await readStore();
        await writeStore(refreshStoreMatches(latest));
      } catch (err) {
        console.error("deferred match refresh failed", err);
      }
    });

    return ok({
      reply: result.reply,
      provider: result.provider,
      aiMode: hasGeminiKey() ? "gemini" : "heuristic",
      role,
    });
  } catch (e) {
    return fail(e);
  }
}
