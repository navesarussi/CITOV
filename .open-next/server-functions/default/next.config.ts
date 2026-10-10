import type { NextConfig } from "next";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const isCfWorkersBuild = process.env.CF_WORKERS_BUILD === "1";
const cfStubDir = "./src/infrastructure/cf-build-stubs";

function cfResolveAliases(): Record<string, string> {
  if (!isCfWorkersBuild) return {};
  return {
    mammoth: `${cfStubDir}/mammoth.ts`,
    unpdf: `${cfStubDir}/unpdf.ts`,
    "next/dist/compiled/@vercel/og/index.node.js": `${cfStubDir}/vercel-og.ts`,
    "next/dist/compiled/@vercel/og/index.edge.js": `${cfStubDir}/vercel-og.ts`,
    "@/application/eval-matching-dataset": `${cfStubDir}/eval-dataset.ts`,
    "@/application/eval-embed-fixture": `${cfStubDir}/load-embed-fixture.ts`,
    "@/application/eval-holdout-judgments": `${cfStubDir}/load-holdout-judgments.ts`,
  };
}

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

const cfAliases = cfResolveAliases();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_BUILD_ID: resolveBuildId(),
    NEXT_PUBLIC_APP_BUILD_TIME: resolveBuildTimeIso(),
    ...(isCfWorkersBuild ? { CF_WORKERS_BUILD: "1" } : {}),
  },
  ...(isCfWorkersBuild
    ? {
        output: "standalone",
        images: { unoptimized: true },
        outputFileTracingExcludes: {
          "*": [
            "./eval/matching/fixtures/**",
            "./eval/matching/labeling/**",
            "./eval/matching/results/**",
            "./scripts/**",
            "./e2e/**",
            "./docs/**",
          ],
        },
        experimental: {
          optimizePackageImports: ["zod", "ai", "@ai-sdk/google"],
        },
      }
    : {}),
  turbopack: {
    resolveAlias: cfAliases,
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = { ...config.resolve.alias, ...cfAliases };
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Keep the file-parsing libs out of the server bundle (they use Node built-ins
  // and ship their own workers/assets). CF build replaces them with stubs via resolveAlias.
  serverExternalPackages: isCfWorkersBuild ? [] : ["unpdf", "mammoth"],
};

export default nextConfig;
