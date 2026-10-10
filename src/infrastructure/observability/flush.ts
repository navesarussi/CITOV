import { after } from "next/server";
import { flushLangfuseTraces } from "./langfuse-register";
import { isLangfuseEnabled } from "./langfuse-env";

/** Ensure Langfuse spans export before Vercel/serverless freezes the process. */
export function scheduleObservabilityFlush(): void {
  if (!isLangfuseEnabled()) return;
  after(async () => {
    await flushLangfuseTraces();
  });
}
