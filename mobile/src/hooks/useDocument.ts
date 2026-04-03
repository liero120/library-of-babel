import { useState, useEffect, useCallback } from 'react';
import { fetchDocument } from '../api/client.ts';
import type { DocumentDetail, Section } from '../api/types.ts';

export function useDocument(docId: number | null) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!docId) { setDocument(null); return; }
    setLoading(true);
    fetchDocument(docId)
      .then((doc) => { setDocument(doc); setCurrentIdx(0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [docId]);

  const sections = document?.sections ?? [];
  const currentSection: Section | null = sections[currentIdx] ?? null;
  const totalSections = sections.length;

  const next = useCallback(() => {
    setCurrentIdx((i) => Math.min(i + 1, totalSections - 1));
  }, [totalSections]);

  const prev = useCallback(() => {
    setCurrentIdx((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, totalSections - 1)));
  }, [totalSections]);

  return {
    document,
    sections,
    currentSection,
    currentIdx,
    totalSections,
    next,
    prev,
    goTo,
    loading,
  };
}
