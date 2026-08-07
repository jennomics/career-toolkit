"use client";

interface UnresolvedItem {
  id: string;
  section: string;
  description: string;
  optionA: string;
  optionB: string;
  resolution: string | null;
  resolvedAt: string | null;
  priority: string;
}

interface UnresolvedItemsSectionProps {
  items: UnresolvedItem[];
  onResolve: (id: string, resolution: string) => Promise<void>;
}

export default function UnresolvedItemsSection({
  items,
  onResolve,
}: UnresolvedItemsSectionProps) {
  const unresolvedItems = items.filter((item) => !item.resolution);
  const resolvedItems = items.filter((item) => item.resolution);

  return (
    <div className="space-y-4">
      {unresolvedItems.length > 0 && (
        <div
          className="border-t border-rule pt-s-2"
          role="alert"
          aria-label="Unresolved items require attention"
        >
          <p className="font-mono text-meta uppercase tracking-widest text-ink">
            {unresolvedItems.length} item{unresolvedItems.length !== 1 ? "s" : ""} need resolution before resume generation
          </p>
        </div>
      )}

      {unresolvedItems.length > 0 && (
        <div className="space-y-0">
          {unresolvedItems.map((item) => (
            <div
              key={item.id}
              className="border-t border-rule py-s-3 space-y-s-2"
            >
              <div className="flex items-start gap-s-2">
                <span className="font-mono text-meta text-ink-50">
                  {item.section}
                </span>
                <span className="font-mono text-meta text-ink-50 capitalize">
                  {item.priority}
                </span>
              </div>
              <p className="text-body text-ink-72">{item.description}</p>
              <div className="flex flex-col sm:flex-row gap-s-2">
                <button
                  onClick={() => onResolve(item.id, item.optionA)}
                  className="flex-1 border border-ink text-ink bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer text-left"
                  aria-label={`Choose option A: ${item.optionA}`}
                >
                  A: {item.optionA}
                </button>
                <button
                  onClick={() => onResolve(item.id, item.optionB)}
                  className="flex-1 border border-ink text-ink bg-transparent h-[48px] px-s-3 font-medium inline-flex items-center cursor-pointer text-left"
                  aria-label={`Choose option B: ${item.optionB}`}
                >
                  B: {item.optionB}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolvedItems.length > 0 && (
        <div className="mt-s-3">
          <h3 className="font-mono text-meta uppercase tracking-widest text-ink-50 mb-s-1">
            Resolved ({resolvedItems.length})
          </h3>
          <div className="space-y-0">
            {resolvedItems.map((item) => (
              <div
                key={item.id}
                className="border-t border-rule py-s-2"
              >
                <p className="text-body text-ink-72">{item.description}</p>
                <p className="font-mono text-meta text-ink-35 mt-0.5">
                  Resolved: {item.resolution}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-body text-ink-35">No unresolved items.</p>
      )}
    </div>
  );
}
