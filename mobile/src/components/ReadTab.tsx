import { useState, useEffect, useCallback } from 'react';
import { useDocument } from '../hooks/useDocument.ts';
import { useProvocation } from '../hooks/useProvocation.ts';
import { updateSession } from '../api/client.ts';
import type { EngagementMode } from '../api/types.ts';
import DocumentSection from './DocumentSection.tsx';
import ModeSelector from './ModeSelector.tsx';
import ProvocationPanel from './ProvocationPanel.tsx';

export default function ReadTab({
  docId,
  sessionId,
}: {
  docId: number | null;
  sessionId: number | null;
}) {
  const { document: doc, currentSection, currentIdx, totalSections, next, prev, loading: docLoading } = useDocument(docId);
  const { provocations, loading: provLoading, error, provoke } = useProvocation(sessionId, currentIdx);
  const [mode, setMode] = useState<EngagementMode>('provocation');

  // Sync section position to backend
  useEffect(() => {
    if (sessionId && docId) {
      updateSession(sessionId, { current_section: currentIdx }).catch(() => {});
    }
  }, [sessionId, docId, currentIdx]);

  const handleProvoke = useCallback((action: string, lensType?: string) => {
    if (!docId) return;
    provoke(docId, mode, action, lensType);
  }, [docId, mode, provoke]);

  if (!docId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-dim px-8 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 text-amber-glow/30">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
        <p className="text-sm">No document open.</p>
        <p className="text-xs mt-1">Go to the Library tab to load a document.</p>
      </div>
    );
  }

  if (docLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-amber-glow/30 border-t-amber-glow rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Document section */}
      <DocumentSection
        section={currentSection}
        currentIdx={currentIdx}
        totalSections={totalSections}
        onPrev={prev}
        onNext={next}
        docTitle={doc?.title ?? ''}
      />

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Mode selector */}
      <div className="px-4 py-3">
        <ModeSelector active={mode} onChange={setMode} />
      </div>

      {/* Provocation panel */}
      <ProvocationPanel
        mode={mode}
        provocations={provocations}
        loading={provLoading}
        error={error}
        onProvoke={handleProvoke}
      />
    </div>
  );
}
