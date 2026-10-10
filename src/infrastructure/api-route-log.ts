import { recordAppEventSafe } from "@/infrastructure/db/app-events";
import { scheduleObservabilityFlush } from "@/infrastructure/observability/flush";
import { captureServerException } from "@/infrastructure/observability/sentry-server";

export function withApiLogging(
  route: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    scheduleObservabilityFlush();
    const start = Date.now();
    try {
      const res = await handler(req);
      const ms = Date.now() - start;
      if (ms >= 1500) {
        recordAppEventSafe({
          kind: "slow_request",
          severity: ms >= 5000 ? "warn" : "info",
          route,
          durationMs: ms,
          message: `Slow ${route} (${ms}ms)`,
        });
      }
      if (res.status >= 400) {
        recordAppEventSafe({
          kind: "api_error",
          severity: res.status >= 500 ? "critical" : "warn",
          route,
          statusCode: res.status,
          message: `HTTP ${res.status} on ${route}`,
        });
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      recordAppEventSafe({
        kind: "api_error",
        severity: "critical",
        route,
        statusCode: 500,
        message: msg,
        stack: err instanceof Error ? err.stack : undefined,
      });
      void captureServerException(err, { extra: { route } });
      throw err;
    }
  };
}
