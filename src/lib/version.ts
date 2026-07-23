export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const BUILD_ID = process.env.NEXT_PUBLIC_APP_BUILD_ID ?? "dev";

export function formatAppVersion(): string {
  return `v${APP_VERSION} (${BUILD_ID})`;
}
