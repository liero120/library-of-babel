import { useState, useEffect, useCallback } from 'react';
import { provoke, fetchProvocations } from '../api/client.ts';
import type { Provocation, EngagementMode } from '../api/types.ts';

export function useProvocation(sessionId: number | null, sectionIdx: number) {
  const [provocations, setProvocations] = useState<Provocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing provocations for this section
  useEffect(() => {
    if (!sessionId) { setProvocations([]); return; }
    fetchProvocations(sessionId, sectionIdx)
      .then((data) => setProvocations(data.provocations))
      .catch(console.error);
  }, [sessionId, sectionIdx]);

  const doProvoke = useCallback(async (
    docId: number,
    mode: EngagementMode,
    action: string,
    lensType?: string,
  ) => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await provoke({
        session_id: sessionId,
        doc_id: docId,
        section_idx: sectionIdx,
        mode,
        action,
        lens_type: lensType,
      });
      setProvocations((prev) => [...prev, result]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [sessionId, sectionIdx]);

  return { provocations, loading, error, provoke: doProvoke };
}
