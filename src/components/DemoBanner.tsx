"use client";

export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return null;
  }

  return (
    <div className="flex min-h-[var(--target-min)] items-center justify-center border-b border-rule bg-paper px-s-3 py-s-1 text-center text-meta font-mono uppercase tracking-widest text-ink-50">
      This is a read-only demo with synthetic data. Mutations are disabled.
    </div>
  );
}
