"use client";

interface CareerRole {
  id: string;
  period: string;
  organization: string;
  title: string;
  scope: string | null;
  highlights: string[];
  sortOrder: number;
}

interface CareerRolesSectionProps {
  roles: CareerRole[];
}

export default function CareerRolesSection({ roles }: CareerRolesSectionProps) {
  if (roles.length === 0) {
    return (
      <p className="text-body text-ink-35">No career roles yet.</p>
    );
  }

  return (
    <div className="space-y-0">
      {roles.map((role) => (
        <div
          key={role.id}
          className="border-t border-rule py-s-3 space-y-1"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-body font-medium text-ink">
                {role.title}
              </h3>
              <p className="text-list text-ink-72">
                {role.organization}
              </p>
            </div>
            <span className="font-mono text-meta text-ink-50">{role.period}</span>
          </div>
          {role.scope && (
            <p className="text-list text-ink-72">{role.scope}</p>
          )}
          {role.highlights.length > 0 && (
            <ul className="space-y-1 mt-s-1">
              {role.highlights.map((highlight, idx) => (
                <li
                  key={idx}
                  className="text-list text-ink-72 pl-s-2 border-l border-rule"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
