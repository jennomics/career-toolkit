"use client";

export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm font-medium text-amber-900">
      This is a read-only demo with synthetic data. Mutations are disabled.
    </div>
  );
}
