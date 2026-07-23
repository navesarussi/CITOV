"use client";

type JobMeta = { id: string; title?: string; field?: string };

export function JobFilterBar(props: {
  label: string;
  jobs: JobMeta[];
  activeJobId: string | null;
  busy: boolean;
  newJobLabel: string;
  jobLabel: (job: JobMeta, index: number) => string;
  onSelect: (jobId: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="enter-delay mb-5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--muted)]">{props.label}</span>
      {props.jobs.map((job, i) => (
        <button
          key={job.id}
          type="button"
          disabled={props.busy}
          onClick={() => props.onSelect(job.id)}
          className={
            job.id === props.activeJobId
              ? "cursor-pointer rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white transition duration-200"
              : "cursor-pointer rounded-full border border-[var(--stroke)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink)] transition duration-200 hover:border-[var(--accent)]"
          }
        >
          {props.jobLabel(job, i)}
        </button>
      ))}
      <button
        type="button"
        disabled={props.busy}
        onClick={props.onCreate}
        className="cursor-pointer rounded-full border border-dashed border-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition duration-200 hover:bg-[var(--bubble)]"
      >
        + {props.newJobLabel}
      </button>
    </div>
  );
}
