"use client";

type ProfileMeta = { id: string; label: string; kind: "self" | "other" };

export function CandidateProfileBar(props: {
  label: string;
  profiles: ProfileMeta[];
  activeProfileId: string | null;
  busy: boolean;
  onSelect: (profileId: string) => void;
}) {
  if (props.profiles.length < 2) return null;

  return (
    <div className="enter-delay mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--stroke)] bg-[color-mix(in_srgb,var(--surface)_80%,white)] p-3 shadow-[var(--shadow-soft)]">
      <span className="w-full text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase sm:w-auto sm:pe-2">
        {props.label}
      </span>
      {props.profiles.map((profile) => {
        const active = profile.id === props.activeProfileId;
        return (
          <button
            key={profile.id}
            type="button"
            disabled={props.busy}
            onClick={() => props.onSelect(profile.id)}
            className={
              active
                ? "cursor-pointer rounded-full bg-[var(--hero)] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(16,42,80,0.18)] transition duration-200"
                : "cursor-pointer rounded-full border border-[var(--stroke)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--ink)] transition duration-200 hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }
          >
            {profile.label}
          </button>
        );
      })}
    </div>
  );
}
