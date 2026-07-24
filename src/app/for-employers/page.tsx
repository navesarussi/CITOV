import { RoleLandingPage } from "@/components/RoleLandingPage";
import { getSessionFlags } from "@/lib/session-flags-server";

export default async function EmployerHomePage() {
  const initialFlags = await getSessionFlags();
  return <RoleLandingPage role="employer" initialFlags={initialFlags} />;
}
