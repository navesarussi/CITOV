import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { isLangfuseEnabled } from "./langfuse-env";

let processor: LangfuseSpanProcessor | null = null;
let started = false;

export function getLangfuseSpanProcessor(): LangfuseSpanProcessor | null {
  return processor;
}

export function registerLangfuseOtel(): void {
  if (started || !isLangfuseEnabled()) return;
  started = true;
  processor = new LangfuseSpanProcessor();
  const sdk = new NodeSDK({
    spanProcessors: [processor],
  });
  sdk.start();
}

export async function flushLangfuseTraces(): Promise<void> {
  if (!processor) return;
  try {
    await processor.forceFlush();
  } catch {
    // best-effort for serverless
  }
}
