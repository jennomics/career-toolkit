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
      <p className="text-body text-ink-35">No metrics yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="border-t border-rule py-s-2 px-s-1"
        >
          <p className="font-mono text-meta uppercase tracking-widest text-ink-50">{metric.label}</p>
          <p className="font-mono text-h3 text-ink mt-0.5">
            {metric.value}
          </p>
          {metric.source && (
            <p className="font-mono text-meta text-ink-35 mt-0.5">{metric.source}</p>
          )}
        </div>
      ))}
    </div>
  );
}
