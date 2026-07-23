export function SegmentedTabs(props: {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-[var(--stroke)] bg-[var(--chip)] p-1 text-sm shadow-inner">
      {props.tabs.map((tab) => {
        const active = tab.id === props.value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => props.onChange(tab.id)}
            className={
              active
                ? "cursor-pointer rounded-full bg-white px-4 py-2 font-semibold text-[var(--hero)] shadow-md transition duration-200"
                : "cursor-pointer rounded-full px-4 py-2 text-[var(--muted)] transition duration-200 hover:text-[var(--ink)]"
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
