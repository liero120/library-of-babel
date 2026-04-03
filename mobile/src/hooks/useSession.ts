import { useState, useCallback } from 'react';
import { createSession, updateSession as apiUpdateSession } from '../api/client.ts';
import type { Session, EngagementMode } from '../api/types.ts';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);

  const create = useCallback(async (docId: number, mode: EngagementMode = 'provocation') => {
    const s = await createSession(docId, mode);
    setSession(s);
    return s;
  }, []);

  const update = useCallback(async (data: {
    current_section?: number;
    mode?: string;
    lens_type?: string;
  }) => {
    if (!session) return;
    const updated = await apiUpdateSession(session.id, data);
    setSession(updated);
  }, [session]);

  return { session, create, update, setSession };
}
