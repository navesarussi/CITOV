export async function register() {
  if (process.env.CF_WORKERS_BUILD === "1") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    const { registerLangfuseOtel } = await import(
      "@/infrastructure/observability/langfuse-register"
    );
    registerLangfuseOtel();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
