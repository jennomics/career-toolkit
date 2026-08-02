"use client";

interface ProfileMetric {
  id: string;
  label: string;
  value: string;
  source: string | null;
}

interface MetricsSectionProps {
  metrics: ProfileMetric[];
}

export default function MetricsSection({ metrics }: MetricsSectionProps) {
  if (metrics.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">No metrics yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="border border-gray-200 rounded-lg p-3"
        >
          <p className="text-xs font-medium text-gray-500">{metric.label}</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            {metric.value}
          </p>
          {metric.source && (
            <p className="text-xs text-gray-400 mt-1">{metric.source}</p>
          )}
        </div>
      ))}
    </div>
  );
}
