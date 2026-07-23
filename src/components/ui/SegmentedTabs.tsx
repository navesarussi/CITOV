export function SegmentedTabs(props: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex rounded-xl bg-[var(--chip)] p-1 text-sm">
      {props.tabs.map((tab) => {
        const active = tab.id === props.value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => props.onChange(tab.id)}
            className={
              active
                ? "cursor-pointer rounded-lg bg-[var(--surface)] px-3 py-1.5 font-medium text-[var(--hero)] shadow-sm transition duration-200"
                : "cursor-pointer rounded-lg px-3 py-1.5 text-[var(--muted)] transition duration-200 hover:text-[var(--ink)]"
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
