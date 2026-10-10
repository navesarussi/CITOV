import { randomUUID } from "crypto";
import { saveCandidateCv } from "@/application/cv-import";
import {
  createOtherPersonProfile,
  ensureProfilePack,
  persistActiveProfile,
  replaceEmployee,
} from "@/domain/candidate-profiles";
import { emptyCandidateCard, type ChatMessage } from "@/domain/types";
import { addEmployerJob, normalizeEmployerRecord } from "@/domain/employer-jobs";
import { assertActor } from "@/infrastructure/auth-guard";
import { persistEmployeeProfile, persistEmployerProfile } from "@/infrastructure/db/scoped-store";
import { isE2eAuthEnabled } from "@/infrastructure/e2e-auth";
import { saveCandidateDocumentBlob } from "@/infrastructure/files/cv-storage";
import { ok } from "@/infrastructure/http";

function authorized(req: Request): boolean {
  return req.headers.get("x-e2e-secret") === process.env.E2E_SECRET?.trim();
}

function userMessage(text: string): ChatMessage {
  return {
    id: randomUUID(),
    role: "user",
    content: text,
    createdAt: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  if (!isE2eAuthEnabled() || !authorized(req)) {
    return ok({ error: "E2E auth disabled" }, { status: 403 });
  }
  const body = (await req.json()) as {
    userId?: string;
    scenario?: "multi_profile" | "employer_jobs";
  };
  const userId = body.userId?.trim();
  if (!userId?.startsWith("e2e-")) {
    return ok({ error: "invalid e2e user" }, { status: 400 });
  }
  const gate = await assertActor(userId);
  if (!gate.ok) return ok({ error: gate.error }, { status: gate.status });

  if (body.scenario === "employer_jobs") {
    let employer = normalizeEmployerRecord(
      gate.store.employers.find((e) => e.userId === userId)!,
    );
    const markers = ["E2E-JOB-A", "E2E-JOB-B", "E2E-JOB-C"];
    for (const marker of markers) {
      employer = addEmployerJob(employer, { name: marker });
      const job = employer.jobs[employer.jobs.length - 1]!;
      employer = {
        ...employer,
        jobs: employer.jobs.map((j) =>
          j.id === job.id ? { ...j, chat: [...j.chat, userMessage(marker)] } : j,
        ),
      };
    }
    const next = {
      ...gate.store,
      employers: gate.store.employers.map((e) => (e.userId === userId ? employer : e)),
    };
    await persistEmployerProfile({
      store: next,
      userId,
      card: employer.card,
      jobs: employer.jobs,
      activeJobId: employer.activeJobId,
    });
    return ok({
      ok: true,
      jobs: employer.jobs.map((j) => ({ id: j.id, name: j.name, chatLen: j.chat.length })),
    });
  }

  const raw = gate.store.employees.find((e) => e.userId === userId);
  if (!raw) return ok({ error: "employee missing" }, { status: 404 });

  let emp = ensureProfilePack(raw);
  const docId = randomUUID();
  const cvText =
    "E2E CV\nשם: בדיקה אוטומטית\nניסיון: 3 שנים בתפקיד מפתח\nSkills: TypeScript, React";
  const storageKey = await saveCandidateDocumentBlob({
    id: docId,
    userId,
    content: Buffer.from(cvText, "utf8"),
  });
  let store = saveCandidateCv(gate.store, {
    userId,
    id: docId,
    fileName: "e2e-cv.txt",
    mimeType: "text/plain",
    byteSize: cvText.length,
    storageKey,
    extractedText: cvText,
  }).store;
  emp = store.employees.find((e) => e.userId === userId)!;

  const markers = ["E2E-PROFILE-SELF", "E2E-PROFILE-OTHER-1", "E2E-PROFILE-OTHER-2"];
  emp = persistActiveProfile({
    ...emp,
    chat: [...emp.chat, userMessage(markers[0]!)],
  });
  emp = createOtherPersonProfile(emp, "קרוב א", { ...emptyCandidateCard(), summary: markers[1]! }, [
    userMessage(markers[1]!),
  ]);
  emp = createOtherPersonProfile(emp, "קרוב ב", { ...emptyCandidateCard(), summary: markers[2]! }, [
    userMessage(markers[2]!),
  ]);

  store = {
    ...gate.store,
    employees: replaceEmployee(gate.store.employees, emp),
  };
  await persistEmployeeProfile({
    store,
    userId,
    card: emp.card,
    pendingFieldQuestionIds: emp.pendingFieldQuestionIds,
    cv: emp.cv,
  });

  const pack = emp.cv?.profilePack;
  return ok({
    ok: true,
    profiles: pack?.profiles.map((p) => ({
      id: p.id,
      label: p.label,
      chatMarker: p.chat.find((m) => m.role === "user")?.content,
    })),
    activeProfileId: pack?.activeProfileId,
  });
}
