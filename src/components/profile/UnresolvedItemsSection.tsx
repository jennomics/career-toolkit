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
          className="bg-amber-50 border border-amber-200 rounded-lg p-4"
          role="alert"
          aria-label="Unresolved items require attention"
        >
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm font-semibold text-amber-800">
              {unresolvedItems.length} item{unresolvedItems.length !== 1 ? "s" : ""} need resolution before resume generation
            </p>
          </div>
        </div>
      )}

      {unresolvedItems.length > 0 && (
        <div className="space-y-3">
          {unresolvedItems.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full mr-2">
                    {item.section}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                    item.priority === "high"
                      ? "bg-red-100 text-red-700"
                      : item.priority === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {item.priority}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700">{item.description}</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onResolve(item.id, item.optionA)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-left bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  aria-label={`Choose option A: ${item.optionA}`}
                >
                  <span className="font-semibold">A:</span> {item.optionA}
                </button>
                <button
                  onClick={() => onResolve(item.id, item.optionB)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-left bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                  aria-label={`Choose option B: ${item.optionB}`}
                >
                  <span className="font-semibold">B:</span> {item.optionB}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolvedItems.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            Resolved ({resolvedItems.length})
          </h3>
          <div className="space-y-2">
            {resolvedItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-100 rounded-lg p-3 bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Resolved: {item.resolution}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-gray-400 italic">No unresolved items.</p>
      )}
    </div>
  );
}
