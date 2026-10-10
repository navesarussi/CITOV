"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="he">
      <body>
        <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
          <h1>משהו השתבש</h1>
          <p>אירעה שגיאה בלתי צפויה. הצוות קיבל התראה.</p>
          <button type="button" onClick={() => reset()}>
            נסו שוב
          </button>
        </main>
      </body>
    </html>
  );
}
