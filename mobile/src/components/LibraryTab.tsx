import { useState, useEffect, useCallback } from 'react';
import { fetchDocuments, deleteDocument, createSession } from '../api/client.ts';
import type { Document } from '../api/types.ts';
import UploadModal from './UploadModal.tsx';

const SOURCE_ICONS: Record<string, string> = {
  pdf: '\uD83D\uDCC4',
  text: '\uD83D\uDCDD',
  markdown: '\uD83D\uDCDD',
  url: '\uD83C\uDF10',
};

export default function LibraryTab({
  onOpenDocument,
}: {
  onOpenDocument: (docId: number, sessionId: number) => void;
}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadDocs = useCallback(() => {
    setLoading(true);
    fetchDocuments()
      .then((data) => setDocuments(data.documents))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleOpen = async (doc: Document) => {
    const session = await createSession(doc.id);
    onOpenDocument(doc.id, session.id);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreated = (_docId: number) => {
    setShowUpload(false);
    loadDocs();
  };

  return (
    <div
      className="min-h-screen px-4 pt-3"
      style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-amber-glow">Library of Babel</h1>
        <span className="text-[10px] text-text-dim">v{__APP_VERSION__}</span>
      </div>

      {/* Empty state */}
      {!loading && documents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-text-dim text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4 text-amber-glow/20">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            <path d="M8 7h8" /><path d="M8 11h6" />
          </svg>
          <p className="text-sm mb-1">Your library is empty</p>
          <p className="text-xs">Add a document to begin critical reading.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-glow/30 border-t-amber-glow rounded-full animate-spin" />
        </div>
      )}

      {/* Document list */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-panel border border-panel-border cursor-pointer transition-colors hover:border-amber-glow/20"
            onClick={() => handleOpen(doc)}
          >
            <span className="text-xl flex-shrink-0">{SOURCE_ICONS[doc.source_type] ?? '\uD83D\uDCC4'}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-text-main truncate">{doc.title}</h3>
              <p className="text-[11px] text-text-dim">
                {doc.section_count} sections &middot; {doc.source_type}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
              disabled={deletingId === doc.id}
              className="text-text-dim/50 hover:text-ember text-sm cursor-pointer px-1"
            >
              {deletingId === doc.id ? '...' : '\u2715'}
            </button>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowUpload(true)}
        className="fixed right-4 bottom-20 w-12 h-12 rounded-full bg-amber-glow text-void flex items-center justify-center text-2xl font-light shadow-lg cursor-pointer hover:scale-105 transition-transform z-50"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        +
      </button>

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
