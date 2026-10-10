export function langfuseBaseUrl(): string {
  return (
    process.env.LANGFUSE_BASEURL?.trim() ||
    process.env.LANGFUSE_BASE_URL?.trim() ||
    "https://cloud.langfuse.com"
  ).replace(/\/$/, "");
}

export function isLangfuseEnabled(): boolean {
  if (process.env.CF_WORKERS_BUILD === "1") return false;
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY?.trim() && process.env.LANGFUSE_SECRET_KEY?.trim(),
  );
}

export function observabilityLinks(): {
  sentry: string | null;
  langfuse: string | null;
} {
  const org = process.env.SENTRY_ORG?.trim();
  const project = process.env.SENTRY_PROJECT?.trim();
  const sentry =
    org && project ? `https://${org}.sentry.io/projects/${project}/` : null;
  const langfuse = isLangfuseEnabled() ? `${langfuseBaseUrl()}/` : null;
  return { sentry, langfuse };
}
