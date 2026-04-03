import { useState, useEffect, useCallback } from 'react';
import { fetchOutline, saveOutline, deleteOutlineNote } from '../api/client.ts';
import type { OutlineNote } from '../api/types.ts';

export function useOutline(docId: number | null) {
  const [notes, setNotes] = useState<OutlineNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!docId) { setNotes([]); return; }
    setLoading(true);
    fetchOutline(docId)
      .then((data) => setNotes(data.notes))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [docId]);

  const notesBySection = notes.reduce<Record<number, OutlineNote[]>>((acc, note) => {
    const key = note.section_idx ?? -1;
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

  const addNote = useCallback(async (sectionIdx: number | null, text: string) => {
    if (!docId) return;
    const { id } = await saveOutline({
      doc_id: docId,
      section_idx: sectionIdx,
      note_text: text,
      position: notes.filter((n) => n.section_idx === sectionIdx).length,
    });
    setNotes((prev) => [...prev, {
      id,
      doc_id: docId,
      section_idx: sectionIdx ?? -1,
      note_text: text,
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as OutlineNote]);
  }, [docId, notes]);

  const updateNote = useCallback(async (noteId: number, text: string) => {
    if (!docId) return;
    await saveOutline({ doc_id: docId, note_text: text, id: noteId });
    setNotes((prev) =>
      prev.map((n) => n.id === noteId ? { ...n, note_text: text, updated_at: new Date().toISOString() } : n)
    );
  }, [docId]);

  const removeNote = useCallback(async (noteId: number) => {
    await deleteOutlineNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  return { notes, notesBySection, addNote, updateNote, removeNote, loading };
}
