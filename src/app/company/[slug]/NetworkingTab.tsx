"use client";

export default function NetworkingTab() {
  return (
    <div className="border-t border-rule pt-s-4 text-center">
      <div className="text-4xl mb-3">
        <svg
          className="w-12 h-12 mx-auto text-ink-35"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-ink-72">Networking features coming soon</h3>
      <p className="text-sm text-ink-35 mt-2">
        Track contacts, outreach, and relationship building for this company.
      </p>
    </div>
  );
}
