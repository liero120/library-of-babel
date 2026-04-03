import { LENS_TYPES } from '../api/types.ts';

export default function LensSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (lens: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-panel border border-panel-border rounded-lg px-3 py-2 text-sm text-text-main appearance-none cursor-pointer focus:outline-none focus:border-cyber-purple"
    >
      {LENS_TYPES.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
