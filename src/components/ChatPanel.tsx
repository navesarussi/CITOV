"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };

export function ChatPanel(props: {
  userId: string;
  role: "employee" | "employer";
  initialMessages: Msg[];
  placeholder: string;
  onDone?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>(props.initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(props.initialMessages);
  }, [props.initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, role: "user", content: text },
    ]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: props.userId,
          role: props.role,
          message: text,
        }),
      });
      const data = await res.json();
      setProvider(data.provider ?? data.aiMode ?? "");
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply ?? data.error ?? "לא הצלחתי לענות",
        },
      ]);
      props.onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-[var(--stroke)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--stroke)] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[var(--ink)]">שיחה עם הסוכן</p>
          <p className="text-xs text-[var(--muted)]">
            מדברים חופשי — הסוכן ממלא את הכרטיס
          </p>
        </div>
        {provider ? (
          <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-[11px] text-[var(--muted)]">
            {provider === "gemini" ? "Gemini" : "מצב מקומי"}
          </span>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            {props.role === "employee"
              ? "ספרו על עצמכם: תפקיד, ניסיון, מיקום, אופי, זמינות — וכמה אתם מוכנים להתפשר (1–10)."
              : "ספרו מה אתם מחפשים: תפקיד, תחום, מיקום, חובה, אופי צוות, וזמנים לראיון."}
          </p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ms-8 rounded-2xl rounded-se-md bg-[var(--accent)] px-3.5 py-2.5 text-sm text-white"
                : "me-8 rounded-2xl rounded-ss-md bg-[var(--bubble)] px-3.5 py-2.5 text-sm text-[var(--ink)]"
            }
          >
            {m.content}
          </div>
        ))}
        {busy ? (
          <p className="text-xs text-[var(--muted)]">הסוכן כותב…</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--stroke)] p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder={props.placeholder}
            className="flex-1 rounded-xl border border-[var(--stroke)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            שליחה
          </button>
        </div>
      </div>
    </div>
  );
}
