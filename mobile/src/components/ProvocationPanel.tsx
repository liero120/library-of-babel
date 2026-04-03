import { useState } from 'react';
import type { EngagementMode, Provocation } from '../api/types.ts';
import { PROVOCATION_ACTIONS, SCAFFOLD_ACTIONS } from '../api/types.ts';
import LensSelector from './LensSelector.tsx';

export default function ProvocationPanel({
  mode,
  provocations,
  loading,
  error,
  onProvoke,
}: {
  mode: EngagementMode;
  provocations: Provocation[];
  loading: boolean;
  error: string | null;
  onProvoke: (action: string, lensType?: string) => void;
}) {
  const [lensType, setLensType] = useState('financial');

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Action buttons — the engagement throttle */}
      <div className="space-y-2">
        {mode === 'provocation' && PROVOCATION_ACTIONS.map(({ action, label, icon }) => (
          <button
            key={action}
            onClick={() => onProvoke(action)}
            disabled={loading}
            className={`action-btn provocation ${loading ? 'opacity-50' : ''}`}
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </button>
        ))}

        {mode === 'lens' && (
          <>
            <LensSelector value={lensType} onChange={setLensType} />
            <button
              onClick={() => onProvoke('lens', lensType)}
              disabled={loading}
              className={`action-btn lens ${loading ? 'opacity-50' : ''}`}
            >
              <span className="text-lg">&#x1F50E;</span>
              <span>Analyze through this lens</span>
            </button>
          </>
        )}

        {mode === 'scaffold' && SCAFFOLD_ACTIONS.map(({ action, label, icon }) => (
          <button
            key={action}
            onClick={() => onProvoke(action)}
            disabled={loading}
            className={`action-btn scaffold ${loading ? 'opacity-50' : ''}`}
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-dim">
          <div className="w-4 h-4 border-2 border-amber-glow/30 border-t-amber-glow rounded-full animate-spin" />
          Generating provocation...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-ember bg-ember-dim rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Provocation history — most recent first */}
      {provocations.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
            Provocations ({provocations.length})
          </h4>
          {[...provocations].reverse().map((p) => (
            <div key={p.id} className={`provocation-card ${p.mode}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  p.mode === 'provocation' ? 'bg-ember-dim text-ember' :
                  p.mode === 'lens' ? 'bg-cyber-purple-dim text-cyber-purple' :
                  'bg-sage-dim text-sage'
                }`}>
                  {p.mode}
                </span>
                <span className="text-[10px] text-text-dim">{p.action}</span>
                {p.lens_type && (
                  <span className="text-[10px] text-cyber-purple">{p.lens_type}</span>
                )}
              </div>
              <div className="provocation-text text-sm text-text-main/90 leading-relaxed">
                {p.response.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
