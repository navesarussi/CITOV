import { isEmployerApprovedIdentityRevealEnabled } from "@/domain/employer-candidate-privacy";
import { employerCanViewCandidateIdentity } from "@/domain/match-identity-reveal";
import type { StoreData, User } from "./types";

export type CvViewer = {
  userId: string;
  isAdmin: boolean;
};

/** FR-CV-05: admin; employer only on approved match + verified + identity reveal flag. */
export function canViewCandidateCv(
  store: StoreData,
  viewer: CvViewer,
  candidateId: string,
): boolean {
  if (viewer.isAdmin) return true;
  if (viewer.userId === candidateId) return false;

  const viewerUser: User | undefined = store.users.find((u) => u.id === viewer.userId);
  if (!viewerUser || viewerUser.role !== "employer") return false;
  if (viewerUser.employerVerified === false) return false;
  if (!isEmployerApprovedIdentityRevealEnabled()) return false;

  return store.matches.some(
    (m) =>
      m.jobOwnerId === viewer.userId &&
      m.candidateId === candidateId &&
      employerCanViewCandidateIdentity(m),
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
