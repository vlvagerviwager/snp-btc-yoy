type Props = {
  years: number[];
  selected: number[];
  onChange: (next: number[]) => void;
  label: string;
};

export function YearFilter({ years, selected, onChange, label }: Props) {
  const toggle = (y: number) => {
    if (selected.includes(y)) onChange(selected.filter((v) => v !== y));
    else onChange([...selected, y].sort((a, b) => a - b));
  };
  const all = () => onChange([...years]);
  const none = () => onChange([]);

  return (
    <div className="year-filter" role="group" aria-label={label} data-testid={`filter-${label}`}>
      <div className="year-filter-actions">
        <button type="button" onClick={all} data-testid={`all-${label}`}>
          All
        </button>
        <button type="button" onClick={none} data-testid={`none-${label}`}>
          None
        </button>
      </div>
      <div className="year-filter-grid">
        {years.map((y) => (
          <label key={y} className="year-chip">
            <input
              type="checkbox"
              checked={selected.includes(y)}
              onChange={() => toggle(y)}
              data-testid={`year-${label}-${y}`}
            />
            {y}
          </label>
        ))}
      </div>
    </div>
  );
}
