/** Optional owner notification when a new critical monitoring issue is recorded. */

const recentAlerts = new Map<string, number>();
const DEDUPE_MS = 60 * 60 * 1000;

function dedupeKey(fingerprint: string): string {
  return fingerprint;
}

function shouldSend(fingerprint: string): boolean {
  const key = dedupeKey(fingerprint);
  const last = recentAlerts.get(key);
  const now = Date.now();
  if (last && now - last < DEDUPE_MS) return false;
  recentAlerts.set(key, now);
  return true;
}

export async function notifyOwnerCriticalIssue(input: {
  fingerprint: string;
  message: string;
  route?: string | null;
}): Promise<void> {
  if (!shouldSend(input.fingerprint)) return;

  const to = process.env.OWNER_ALERT_EMAIL?.trim();
  const webhook = process.env.OWNER_ALERT_WEBHOOK?.trim();
  const subject = `[CITOV] Critical: ${input.route ?? "app"}`;
  const body = `${input.message}\n\nRoute: ${input.route ?? "—"}\nFingerprint: ${input.fingerprint}`;

  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, body, severity: "critical", route: input.route }),
    }).catch((err) => console.error("owner alert webhook failed", err));
    return;
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() ?? "alerts@citov.tech";
  if (to && resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text: body,
      }),
    }).catch((err) => console.error("owner alert email failed", err));
  }
}
