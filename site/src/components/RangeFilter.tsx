import { RANGES, type Range } from "../lib/data";

type Props = {
  value: Range;
  onChange: (r: Range) => void;
  label: string;
};

export function RangeFilter({ value, onChange, label }: Props) {
  return (
    <div className="range-filter" role="group" aria-label={`${label} range`} data-testid={`range-${label}`}>
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          data-testid={`range-${label}-${r}`}
          className={value === r ? "range-btn active" : "range-btn"}
          onClick={() => onChange(r)}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
