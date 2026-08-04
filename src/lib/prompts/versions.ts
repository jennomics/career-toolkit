/**
 * Prompt template versioning system.
 * Each prompt module registers its templates here for centralized lookup.
 */

export interface PromptTemplate {
  version: string;
  systemPrompt: string;
  userPromptBuilder: (...args: unknown[]) => string;
}

const registry: Map<string, PromptTemplate[]> = new Map();

/**
 * Register a prompt template version. Called by each prompt module on import.
 */
export function registerPromptTemplate(
  templateName: string,
  template: PromptTemplate
): void {
  const versions = registry.get(templateName) ?? [];
  versions.push(template);
  registry.set(templateName, versions);
}

/**
 * Retrieve a prompt template by name and optional version.
 * If no version is specified, returns the latest registered version.
 * Throws if the template or version is not found.
 */
export function getPromptVersion(
  templateName: string,
  version?: string
): PromptTemplate {
  const versions = registry.get(templateName);
  if (!versions || versions.length === 0) {
    throw new Error(`Prompt template "${templateName}" not found in registry`);
  }

  if (version) {
    const match = versions.find((t) => t.version === version);
    if (!match) {
      throw new Error(
        `Version "${version}" not found for prompt template "${templateName}"`
      );
    }
    return match;
  }

  // Return the latest (last registered) version
  return versions[versions.length - 1];
}
