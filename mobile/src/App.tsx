import { useState, useCallback } from 'react';
import ReadTab from './components/ReadTab.tsx';
import OutlineTab from './components/OutlineTab.tsx';
import LibraryTab from './components/LibraryTab.tsx';

type Tab = 'read' | 'outline' | 'library';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] bg-void border-t border-white/10 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button
        onClick={() => onChange('read')}
        className={`
          flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 cursor-pointer transition-colors duration-200
          ${active === 'read' ? 'text-amber-glow' : 'text-text-dim hover:text-text-main'}
        `}
      >
        {/* Book icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${active === 'read' ? 'text-amber-glow' : ''}`}>
          Read
        </span>
      </button>

      <button
        onClick={() => onChange('outline')}
        className={`
          flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 cursor-pointer transition-colors duration-200
          ${active === 'outline' ? 'text-sage' : 'text-text-dim hover:text-text-main'}
        `}
      >
        {/* Pencil/list icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${active === 'outline' ? 'text-sage' : ''}`}>
          Outline
        </span>
      </button>

      <button
        onClick={() => onChange('library')}
        className={`
          flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 cursor-pointer transition-colors duration-200
          ${active === 'library' ? 'text-cyber-purple' : 'text-text-dim hover:text-text-main'}
        `}
      >
        {/* Stack/library icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8" />
          <path d="M8 11h6" />
        </svg>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${active === 'library' ? 'text-cyber-purple' : ''}`}>
          Library
        </span>
      </button>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [activeDocId, setActiveDocId] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const openDocument = useCallback((docId: number, sessionId: number) => {
    setActiveDocId(docId);
    setActiveSessionId(sessionId);
    setActiveTab('read');
  }, []);

  return (
    <div className="pb-16">
      {activeTab === 'read' ? (
        <ReadTab docId={activeDocId} sessionId={activeSessionId} />
      ) : activeTab === 'outline' ? (
        <OutlineTab docId={activeDocId} />
      ) : (
        <LibraryTab onOpenDocument={openDocument} />
      )}
      <TabBar active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
