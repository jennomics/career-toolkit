import Link from "next/link";

interface NavProps {
  title: string;
  subtitle?: string;
}

const NAV_LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/tracker", label: "Tracker" },
  { href: "/experience", label: "Experience" },
  { href: "/skills", label: "Skills" },
  { href: "/resume", label: "Resume" },
  { href: "/phrases", label: "Phrases" },
  { href: "/companies", label: "Companies" },
  { href: "/profile", label: "Profile" },
  { href: "/claims", label: "Claims" },
  { href: "/documents", label: "Documents" },
  { href: "/eval", label: "Eval" },
];

export default function Nav({ title, subtitle }: NavProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <nav aria-label="Main navigation" className="flex gap-4">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
