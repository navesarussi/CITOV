import type { Match, StoreData, User } from "./types";

export type CvViewer = {
  userId: string;
  isAdmin: boolean;
};

/** FR-CV-05: admin always; employer only for matched queued/approved candidates. */
export function canViewCandidateCv(
  store: StoreData,
  viewer: CvViewer,
  candidateId: string,
): boolean {
  if (viewer.isAdmin) return true;
  if (viewer.userId === candidateId) return false;

  const viewerUser: User | undefined = store.users.find((u) => u.id === viewer.userId);
  if (!viewerUser || viewerUser.role !== "employer") return false;

  return store.matches.some(
    (m: Match) =>
      m.jobOwnerId === viewer.userId &&
      m.candidateId === candidateId &&
      (m.status === "queued" || m.status === "approved"),
  );
}

export function findCandidateDocument(
  store: StoreData,
  candidateId: string,
  documentId: string,
) {
  const emp = store.employees.find((e) => e.userId === candidateId);
  return emp?.cv?.documents.find((d) => d.id === documentId) ?? null;
}
