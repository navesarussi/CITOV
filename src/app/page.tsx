import { RoleLandingPage } from "@/components/RoleLandingPage";
import { getSessionFlags } from "@/lib/session-flags-server";

export default async function CandidateHomePage() {
  const initialFlags = await getSessionFlags();
  return <RoleLandingPage role="employee" initialFlags={initialFlags} />;
}
