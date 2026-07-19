import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { emptyCandidateCard, emptyJobCard, type Role, type StoreData } from "@/domain/types";
import { ok, fail } from "@/infrastructure/http";
import { hasGoogleAuth } from "@/infrastructure/ai/schemas";
import { readStore, writeStore } from "@/infrastructure/store";

export async function GET() {
  return ok({ googleAuth: hasGoogleAuth() });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      role?: Role;
      demo?: boolean;
    };
    const store = await readStore();

    if (body.demo && body.role === "employee") {
      return ok({ user: store.users.find((u) => u.id === "demo-employee") });
    }
    if (body.demo && body.role === "employer") {
      return ok({ user: store.users.find((u) => u.id === "demo-employer") });
    }

    const role = body.role === "employer" ? "employer" : "employee";
    const session = await auth();

    if (session?.user?.email) {
      const email = session.user.email;
      const googleId = session.user.googleId ?? session.user.id;
      const existing = store.users.find(
        (u) => u.email === email || (u.googleId && u.googleId === googleId),
      );

      if (existing) {
        const users = store.users.map((u) =>
          u.id === existing.id
            ? {
                ...u,
                role: role as Role,
                name: session.user?.name ?? u.name,
                image: session.user?.image ?? u.image,
                googleId,
                email,
              }
            : u,
        );
        let next: StoreData = { ...store, users };
        next = ensureRoleRecords(next, existing.id, role);
        await writeStore(next);
        return ok({
          user: users.find((u) => u.id === existing.id),
        });
      }

      const id = randomUUID();
      const now = new Date().toISOString();
      let next: StoreData = {
        ...store,
        users: [
          ...store.users,
          {
            id,
            name: session.user.name ?? body.name?.trim() ?? "משתמש/ת",
            role,
            email,
            image: session.user.image ?? undefined,
            googleId,
            createdAt: now,
          },
        ],
      };
      next = ensureRoleRecords(next, id, role);
      await writeStore(next);
      return ok({
        user: next.users.find((u) => u.id === id),
      });
    }

    // Fallback anonymous (no Google session)
    const name =
      body.name?.trim() || (role === "employee" ? "מועמד/ת" : "מעסיק/ה");
    const id = randomUUID();
    const now = new Date().toISOString();
    let next: StoreData = {
      ...store,
      users: [...store.users, { id, name, role, createdAt: now }],
    };
    next = ensureRoleRecords(next, id, role);
    await writeStore(next);
    return ok({ user: { id, name, role, createdAt: now } });
  } catch (e) {
    return fail(e);
  }
}

function ensureRoleRecords(store: StoreData, userId: string, role: Role): StoreData {
  if (role === "employee") {
    if (store.employees.some((e) => e.userId === userId)) return store;
    return {
      ...store,
      employees: [
        ...store.employees,
        {
          userId,
          card: emptyCandidateCard(),
          chat: [],
          pendingFieldQuestionIds: [],
        },
      ],
    };
  }
  if (store.employers.some((e) => e.userId === userId)) return store;
  return {
    ...store,
    employers: [
      ...store.employers,
      { userId, card: emptyJobCard(), chat: [] },
    ],
  };
}
