import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function resolveBuildId(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
}

const pkg = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

function resolveBuildTimeIso(): string {
  if (process.env.VERCEL_DEPLOYMENT_CREATED_AT) {
    return new Date(Number(process.env.VERCEL_DEPLOYMENT_CREATED_AT)).toISOString();
  }
  return new Date().toISOString();
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_BUILD_ID: resolveBuildId(),
    NEXT_PUBLIC_APP_BUILD_TIME: resolveBuildTimeIso(),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  serverExternalPackages: ["unpdf", "mammoth"],
};

const hasSentryUploadToken = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !hasSentryUploadToken,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !hasSentryUploadToken,
  },
  telemetry: false,
});
