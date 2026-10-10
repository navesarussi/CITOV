#!/usr/bin/env node
/**
 * CF Workers bundle diet: stub @vercel/og (+ resvg/yoga WASM) before OpenNext bundles the worker.
 * Run after `next build` with CF_WORKERS_BUILD=1, before `opennextjs-cloudflare build --skipNextBuild`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextServer = join(root, ".next/server");

const OG_CASE = `  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = await import("next/dist/compiled/@vercel/og/index.edge.js");
    break;`;

const OG_STUB = `  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = { ImageResponse: class ImageResponse extends Response {} };
    break;`;

const EXTERNAL_IMPORT_GUARD = `async function externalImport(id) {
    let raw;
    try {
        if (id === "next/dist/compiled/@vercel/og/index.node.js" || id === "next/dist/compiled/@vercel/og/index.edge.js") {
            raw = { ImageResponse: class ImageResponse extends Response {} };
        } else if (false) {
            /* og stub anchor */
        } else {
        raw = await import(id);
        }
    } catch (err) {`;

const EXTERNAL_IMPORT_ORIG = `async function externalImport(id) {
    let raw;
    try {
        raw = await import(id);
    } catch (err) {`;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name === "[turbopack]_runtime.js") out.push(p);
  }
  return out;
}

const runtimes = walk(nextServer);
let patched = 0;
for (const file of runtimes) {
  let src = readFileSync(file, "utf8");
  let next = src;
  if (next.includes(OG_CASE)) {
    next = next.replace(OG_CASE, OG_STUB);
  } else if (next.includes(EXTERNAL_IMPORT_ORIG)) {
    next = next.replace(EXTERNAL_IMPORT_ORIG, EXTERNAL_IMPORT_GUARD);
  }
  if (next !== src) {
    writeFileSync(file, next, "utf8");
    patched += 1;
  }
}

const ogStub = `export class ImageResponse extends Response {}
export default { ImageResponse };
`;

for (const rel of [
  "node_modules/next/dist/compiled/@vercel/og/index.edge.js",
  "node_modules/next/dist/compiled/@vercel/og/index.node.js",
]) {
  writeFileSync(join(root, rel), ogStub, "utf8");
}

console.log(
  `cf-patch-turbopack-runtime: patched ${patched} runtime file(s), stubbed @vercel/og in node_modules`,
);
