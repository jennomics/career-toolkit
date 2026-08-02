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
      <p className="text-sm text-gray-400 italic">No career roles yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {roles.map((role) => (
        <div
          key={role.id}
          className="border border-gray-200 rounded-lg p-4 space-y-2"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {role.title}
              </h3>
              <p className="text-sm text-gray-600">
                {role.organization} | {role.period}
              </p>
            </div>
          </div>
          {role.scope && (
            <p className="text-sm text-gray-600 italic">{role.scope}</p>
          )}
          {role.highlights.length > 0 && (
            <ul className="space-y-1 mt-2">
              {role.highlights.map((highlight, idx) => (
                <li
                  key={idx}
                  className="text-sm text-gray-700 pl-4 border-l-2 border-gray-200"
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
