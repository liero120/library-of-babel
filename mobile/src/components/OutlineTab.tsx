import { useState, useCallback } from 'react';
import { useOutline } from '../hooks/useOutline.ts';
import { useDocument } from '../hooks/useDocument.ts';

export default function OutlineTab({ docId }: { docId: number | null }) {
  const { document: doc, sections } = useDocument(docId);
  const { notes, notesBySection, addNote, updateNote, removeNote, loading } = useOutline(docId);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [addingSectionIdx, setAddingSectionIdx] = useState<number | null>(null);
  const [newText, setNewText] = useState('');

  const startEdit = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = useCallback(async () => {
    if (editingId === null) return;
    await updateNote(editingId, editText);
    setEditingId(null);
  }, [editingId, editText, updateNote]);

  const handleAdd = useCallback(async (sectionIdx: number | null) => {
    if (!newText.trim()) return;
    await addNote(sectionIdx, newText.trim());
    setNewText('');
    setAddingSectionIdx(null);
  }, [newText, addNote]);

  if (!docId || !doc) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] text-text-dim px-8 text-center"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 text-sage/30">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <p className="text-sm">No document open.</p>
        <p className="text-xs mt-1">Open a document from the Library to start your outline.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 pt-3 pb-20"
      style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}
    >
      <h1 className="text-lg font-semibold text-sage mb-1">Your Outline</h1>
      <p className="text-xs text-text-dim mb-4">{doc.title}</p>

      {/* Document-level notes */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
            General Notes
          </h3>
          <button
            onClick={() => { setAddingSectionIdx(-1); setNewText(''); }}
            className="text-xs text-sage cursor-pointer"
          >
            + Add
          </button>
        </div>
        {(notesBySection[-1] ?? []).map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            editing={editingId === note.id}
            editText={editText}
            onStartEdit={() => startEdit(note.id, note.note_text)}
            onEditChange={setEditText}
            onSave={saveEdit}
            onCancel={() => setEditingId(null)}
            onDelete={() => removeNote(note.id)}
          />
        ))}
        {addingSectionIdx === -1 && (
          <AddNoteInput
            value={newText}
            onChange={setNewText}
            onSave={() => handleAdd(null)}
            onCancel={() => setAddingSectionIdx(null)}
          />
        )}
      </div>

      {/* Per-section notes */}
      {sections.map((section, idx) => (
        <div key={idx} className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-text-dim">
              <span className="text-amber-glow/60">S{idx + 1}</span>{' '}
              {section.title || `Section ${idx + 1}`}
            </h3>
            <button
              onClick={() => { setAddingSectionIdx(idx); setNewText(''); }}
              className="text-xs text-sage cursor-pointer"
            >
              + Add
            </button>
          </div>
          {(notesBySection[idx] ?? []).map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              editing={editingId === note.id}
              editText={editText}
              onStartEdit={() => startEdit(note.id, note.note_text)}
              onEditChange={setEditText}
              onSave={saveEdit}
              onCancel={() => setEditingId(null)}
              onDelete={() => removeNote(note.id)}
            />
          ))}
          {addingSectionIdx === idx && (
            <AddNoteInput
              value={newText}
              onChange={setNewText}
              onSave={() => handleAdd(idx)}
              onCancel={() => setAddingSectionIdx(null)}
            />
          )}
        </div>
      ))}

      {notes.length === 0 && !loading && (
        <p className="text-xs text-text-dim text-center py-8">
          No notes yet. This is YOUR space — the AI never writes here.
        </p>
      )}
    </div>
  );
}

function NoteCard({
  note,
  editing,
  editText,
  onStartEdit,
  onEditChange,
  onSave,
  onCancel,
  onDelete,
}: {
  note: { id: number; note_text: string };
  editing: boolean;
  editText: string;
  onStartEdit: () => void;
  onEditChange: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  if (editing) {
    return (
      <div className="mb-2">
        <textarea
          value={editText}
          onChange={(e) => onEditChange(e.target.value)}
          rows={3}
          className="w-full bg-white/5 border border-sage/30 rounded-lg px-3 py-2 text-sm text-text-main resize-none focus:outline-none"
          autoFocus
        />
        <div className="flex gap-2 mt-1">
          <button onClick={onSave} className="text-xs text-sage cursor-pointer">Save</button>
          <button onClick={onCancel} className="text-xs text-text-dim cursor-pointer">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div
      className="group mb-2 p-2 rounded-lg bg-white/3 border border-white/5 cursor-pointer hover:border-sage/20"
      onClick={onStartEdit}
    >
      <p className="text-sm text-text-main/90">{note.note_text}</p>
      <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[10px] text-ember cursor-pointer">
          Delete
        </button>
      </div>
    </div>
  );
}

function AddNoteInput({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mb-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your thoughts..."
        rows={3}
        className="w-full bg-white/5 border border-sage/30 rounded-lg px-3 py-2 text-sm text-text-main placeholder:text-text-dim/50 resize-none focus:outline-none"
        autoFocus
      />
      <div className="flex gap-2 mt-1">
        <button
          onClick={onSave}
          disabled={!value.trim()}
          className="text-xs text-sage cursor-pointer disabled:opacity-30"
        >
          Save
        </button>
        <button onClick={onCancel} className="text-xs text-text-dim cursor-pointer">Cancel</button>
      </div>
    </div>
  );
}
