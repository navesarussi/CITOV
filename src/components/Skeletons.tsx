"use client";

/**
 * Shimmer placeholders shown while data hydrates, so screens read as "loading"
 * instead of flashing an empty state that then pops. All neutral — colors come
 * from the shared palette via the `.skeleton` utility in globals.css.
 */

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-3/4" />
            </div>
            <div className="skeleton h-6 w-14 rounded-full" />
          </div>
          <div className="skeleton mt-4 h-3 w-full" />
          <div className="skeleton mt-2 h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <aside
      className="premium-panel flex flex-col gap-3 rounded-[1.35rem] p-4"
      aria-hidden
    >
      <div className="skeleton h-4 w-1/3" />
      <div className="mt-1 space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-2.5 w-full rounded-full" />
      </div>
      <div className="mt-2 space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-2 w-full rounded-full" />
      </div>
    </aside>
  );
}

export function ChatSkeleton() {
  return (
    <div
      className="premium-panel flex h-full min-h-[440px] flex-col gap-3 rounded-[1.35rem] p-4"
      aria-hidden
    >
      <div className="skeleton h-5 w-40" />
      <div className="mt-2 space-y-3">
        <div className="skeleton h-12 w-4/5 rounded-2xl" />
        <div className="skeleton ms-auto h-10 w-2/3 rounded-2xl" />
        <div className="skeleton h-16 w-3/4 rounded-2xl" />
      </div>
      <div className="skeleton mt-auto h-11 w-full rounded-xl" />
    </div>
  );
}
