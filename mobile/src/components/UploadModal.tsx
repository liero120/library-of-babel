import { useState } from 'react';
import { createDocumentText, createDocumentUrl, uploadDocumentPdf } from '../api/client.ts';

type UploadTab = 'paste' | 'file' | 'url';

export default function UploadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (docId: number) => void;
}) {
  const [tab, setTab] = useState<UploadTab>('paste');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let result: { id: number };
      if (tab === 'paste') {
        if (!text.trim()) { setError('Paste some text first'); setLoading(false); return; }
        result = await createDocumentText(title || 'Untitled', text);
      } else if (tab === 'url') {
        if (!url.trim()) { setError('Enter a URL'); setLoading(false); return; }
        result = await createDocumentUrl(url);
      } else {
        if (!file) { setError('Choose a file'); setLoading(false); return; }
        result = await uploadDocumentPdf(file);
      }
      onCreated(result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-void border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        style={{ animation: 'slide-up 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold text-amber-glow">Add Document</h3>
          <button onClick={onClose} className="text-text-dim text-lg cursor-pointer">&times;</button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-white/5">
          {(['paste', 'file', 'url'] as UploadTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                tab === t ? 'text-amber-glow border-b-2 border-amber-glow' : 'text-text-dim'
              }`}
            >
              {t === 'paste' ? 'Paste Text' : t === 'file' ? 'Upload PDF' : 'Fetch URL'}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {tab === 'paste' && (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-main placeholder:text-text-dim/50 focus:outline-none focus:border-amber-glow/50"
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your text or markdown here..."
                rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-main placeholder:text-text-dim/50 focus:outline-none focus:border-amber-glow/50 resize-none"
              />
            </>
          )}

          {tab === 'file' && (
            <div className="space-y-2">
              <label className="block text-xs text-text-dim">Choose a PDF file</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-text-dim file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-white/10 file:text-text-main file:cursor-pointer"
              />
              {file && <p className="text-xs text-text-dim">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
            </div>
          )}

          {tab === 'url' && (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-main placeholder:text-text-dim/50 focus:outline-none focus:border-amber-glow/50"
            />
          )}

          {error && <p className="text-xs text-ember">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-amber-glow text-void font-semibold text-sm cursor-pointer disabled:opacity-50 transition-colors hover:bg-amber-glow/90"
          >
            {loading ? 'Processing...' : 'Add to Library'}
          </button>
        </div>
      </div>
    </div>
  );
}
