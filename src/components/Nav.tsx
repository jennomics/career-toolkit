"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavProps {
  title: string;
  subtitle?: string;
}

const PRIMARY_LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/tracker", label: "Tracker" },
  { href: "/experience", label: "Experience" },
  { href: "/resume", label: "Resume" },
  { href: "/profile", label: "Profile" },
];

const MORE_LINKS = [
  { href: "/skills", label: "Skills" },
  { href: "/phrases", label: "Phrases" },
  { href: "/companies", label: "Companies" },
  { href: "/claims", label: "Claims" },
  { href: "/documents", label: "Documents" },
  { href: "/eval", label: "Eval" },
];

export default function Nav({ title, subtitle }: NavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-[720px] px-s-3 py-s-3">
        <div className="flex items-center justify-between gap-s-2">
          <div>
            <h1 className="text-h1 font-light text-ink">{title}</h1>
            {subtitle && (
              <p className="mt-s-1 text-body text-ink-50">{subtitle}</p>
            )}
          </div>
        </div>
        <nav aria-label="Main navigation" className="mt-s-2 flex items-center gap-s-3">
          {PRIMARY_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex min-h-[var(--target-min)] items-center text-body text-ink ${
                isActive(href) ? "border-b-2 border-ink" : ""
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              aria-expanded={moreOpen}
              className="inline-flex min-h-[var(--target-min)] items-center text-body text-ink"
            >
              More
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-full z-10 mt-s-1 border border-rule bg-paper">
                {MORE_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={`block min-h-[var(--target-min)] border-b border-rule px-s-3 py-s-1 text-body text-ink last:border-b-0 ${
                      isActive(href) ? "border-b-2 border-b-ink" : ""
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
