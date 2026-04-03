import type { Section } from '../api/types.ts';

export default function DocumentSection({
  section,
  currentIdx,
  totalSections,
  onPrev,
  onNext,
  docTitle,
}: {
  section: Section | null;
  currentIdx: number;
  totalSections: number;
  onPrev: () => void;
  onNext: () => void;
  docTitle: string;
}) {
  if (!section) {
    return (
      <div className="flex items-center justify-center h-48 text-text-dim">
        No document loaded. Open one from the Library tab.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-semibold text-amber-glow truncate max-w-[60%]">
          {docTitle}
        </h2>
        <span className="text-xs text-text-dim">
          Section {currentIdx + 1} of {totalSections}
        </span>
      </div>

      {/* Section title */}
      {section.title && (
        <h3 className="px-4 pt-3 text-sm font-semibold text-text-main/80">
          {section.title}
        </h3>
      )}

      {/* Section text */}
      <div className="px-4 py-3 reading-text max-h-[40vh] overflow-y-auto">
        {section.content.split('\n\n').map((para, i) => (
          <p key={i} className="mb-3 last:mb-0">
            {para}
          </p>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/5">
        <button
          onClick={onPrev}
          disabled={currentIdx === 0}
          className="px-3 py-1.5 text-xs rounded-md bg-white/5 text-text-dim disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors hover:bg-white/10"
        >
          Prev
        </button>

        {/* Progress dots */}
        <div className="flex gap-1 max-w-[60%] overflow-hidden">
          {Array.from({ length: totalSections }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                i === currentIdx ? 'bg-amber-glow' : i < currentIdx ? 'bg-amber-glow/30' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <button
          onClick={onNext}
          disabled={currentIdx >= totalSections - 1}
          className="px-3 py-1.5 text-xs rounded-md bg-white/5 text-text-dim disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors hover:bg-white/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}
