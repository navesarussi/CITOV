import type { ChatMessage } from "@/domain/types";

export function AdminChatLog(props: { chat: ChatMessage[] }) {
  if (props.chat.length === 0) {
    return <p className="text-sm text-[var(--muted)]">אין הודעות בצ׳אט.</p>;
  }
  return (
    <ul className="space-y-2">
      {props.chat.map((m) => (
        <li key={m.id} className="rounded-xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[var(--muted)]">
            <span className="font-semibold text-[var(--hero)]">
              {m.role === "user" ? "משתמש" : m.role === "assistant" ? "סוכן" : m.role}
            </span>
            <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString("he-IL")}</time>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--ink)]">{m.content}</p>
        </li>
      ))}
    </ul>
  );
}
