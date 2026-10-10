export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? "dev";
export const BUILD_TIME_ISO = process.env.NEXT_PUBLIC_APP_BUILD_TIME ?? "";

function formatIsraelTime(iso: string): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("he-IL", {
      timeZone: "Asia/Jerusalem",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function formatAppVersion(): string {
  const deploy = formatIsraelTime(BUILD_TIME_ISO);
  const base = `v${APP_VERSION} (${BUILD_ID})`;
  return deploy ? `${base} · ${deploy}` : base;
}
