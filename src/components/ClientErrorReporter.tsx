"use client";

import { useEffect } from "react";

export function ClientErrorReporter() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      void fetch("/api/events/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: event.message,
          stack: event.error?.stack,
          url: window.location.href,
        }),
      });
    }
    function onRejection(event: PromiseRejectionEvent) {
      const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
      void fetch("/api/events/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          stack: event.reason instanceof Error ? event.reason.stack : undefined,
          url: window.location.href,
        }),
      });
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
