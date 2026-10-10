import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deleteUserAccountData } from "./delete-user-data";
import { readMemoryStore, writeMemoryStore, createSeedStore } from "@/infrastructure/db/memory-store";
import { NotFoundError } from "@/domain/errors";

describe("deleteUserAccountData (memory store)", () => {
  it("refuses demo and removes a custom user", async () => {
    const prevDb = process.env.DATABASE_URL;
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;
    try {
    writeMemoryStore(createSeedStore());
    await assert.rejects(
      () => deleteUserAccountData("demo-employee"),
      (e: unknown) => e instanceof NotFoundError,
    );

    const store = readMemoryStore();
    const customId = "real-user-1";
    writeMemoryStore({
      ...store,
      users: [
        ...store.users,
        {
          id: customId,
          name: "Test",
          role: "employee",
          createdAt: new Date().toISOString(),
        },
      ],
      employees: [
        ...store.employees,
        {
          userId: customId,
          card: store.employees[0]!.card,
          chat: [],
          pendingFieldQuestionIds: [],
        },
      ],
    });

    await deleteUserAccountData(customId);
    const after = readMemoryStore();
    assert.ok(!after.users.some((u) => u.id === customId));
    assert.ok(!after.employees.some((e) => e.userId === customId));
    } finally {
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
      if (prevNode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNode;
    }
  });
});
