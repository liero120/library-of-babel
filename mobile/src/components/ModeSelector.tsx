import type { EngagementMode } from '../api/types.ts';

const MODES: { mode: EngagementMode; label: string; color: string; activeColor: string }[] = [
  { mode: 'provocation', label: 'Provoke', color: 'text-ember', activeColor: 'bg-ember' },
  { mode: 'lens', label: 'Lens', color: 'text-cyber-purple', activeColor: 'bg-cyber-purple' },
  { mode: 'scaffold', label: 'Scaffold', color: 'text-sage', activeColor: 'bg-sage' },
];

export default function ModeSelector({
  active,
  onChange,
}: {
  active: EngagementMode;
  onChange: (mode: EngagementMode) => void;
}) {
  return (
    <div className="flex gap-2 justify-center">
      {MODES.map(({ mode, label, color, activeColor }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={`mode-pill ${
            active === mode
              ? `${activeColor} text-void`
              : `bg-transparent ${color} border-white/10`
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
