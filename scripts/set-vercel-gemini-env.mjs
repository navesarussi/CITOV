#!/usr/bin/env node
/**
 * Set GOOGLE_GENERATIVE_AI_API_KEY on a Vercel project (non-interactive).
 *
 * Usage:
 *   VERCEL_TOKEN=xxx node scripts/set-vercel-gemini-env.mjs
 *   VERCEL_TOKEN=xxx GEMINI_KEY=xxx VERCEL_PROJECT=jobs-ai- node scripts/set-vercel-gemini-env.mjs
 *
 * Get a token: https://vercel.com/account/tokens
 */
const token = process.env.VERCEL_TOKEN?.trim();
const key =
  process.env.GEMINI_KEY?.trim() ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
const projectQuery = process.env.VERCEL_PROJECT?.trim() || "jobs-ai";
const teamId = process.env.VERCEL_TEAM_ID?.trim();

if (!token) {
  console.error("Missing VERCEL_TOKEN");
  process.exit(1);
}
if (!key) {
  console.error("Missing GEMINI_KEY or GOOGLE_GENERATIVE_AI_API_KEY");
  process.exit(1);
}

async function api(path, init = {}) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  const projects = await api("/v9/projects?limit=100");
  const list = projects.projects || projects;
  const project = list.find(
    (p) =>
      p.name === projectQuery ||
      p.name?.includes(projectQuery) ||
      p.id === projectQuery,
  );
  if (!project) {
    console.error(
      "Project not found. Available:",
      list.map((p) => p.name).join(", "),
    );
    process.exit(1);
  }

  console.log(`Using project: ${project.name} (${project.id})`);

  // Remove existing var if present (all targets) so we can recreate cleanly.
  try {
    const envs = await api(`/v9/projects/${project.id}/env`);
    const existing = (envs.envs || []).filter(
      (e) => e.key === "GOOGLE_GENERATIVE_AI_API_KEY",
    );
    for (const env of existing) {
      await api(`/v9/projects/${project.id}/env/${env.id}`, { method: "DELETE" });
      console.log(`Removed old env ${env.id} (${(env.target || []).join(",")})`);
    }
  } catch (e) {
    console.warn("Could not list/remove old env:", e.message);
  }

  const created = await api(`/v10/projects/${project.id}/env`, {
    method: "POST",
    body: JSON.stringify({
      key: "GOOGLE_GENERATIVE_AI_API_KEY",
      value: key,
      type: "sensitive",
      target: ["production", "preview", "development"],
    }),
  });
  console.log("Set GOOGLE_GENERATIVE_AI_API_KEY for production+preview+development");
  console.log("created:", created.created?.uid || created.uid || "ok");
  console.log("Redeploy production for the key to take effect.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
