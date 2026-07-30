"use client";

import CollapsibleSection from "@/components/CollapsibleSection";
import ArrayEditor from "./ArrayEditor";
import { Profile } from "./types";

interface Props {
  profile: Profile;
  onSave: (updates: Partial<Profile>) => void;
}

export default function PositioningSection({ profile, onSave }: Props) {
  return (
    <CollapsibleSection
      title="Positioning Statements"
      badge={profile.positioningStatements.length}
    >
      <ArrayEditor
        label="Statements"
        items={profile.positioningStatements}
        onSave={(items) => onSave({ positioningStatements: items })}
      />
    </CollapsibleSection>
  );
}
