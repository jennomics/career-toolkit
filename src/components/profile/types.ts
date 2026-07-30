export interface CareerRole {
  id: string;
  profileId: string;
  period: string;
  organization: string;
  title: string;
  scope: string | null;
  highlights: string[];
  sortOrder: number;
}

export interface SignatureStory {
  id: string;
  profileId: string;
  title: string;
  situation: string;
  obstacle: string;
  action: string;
  result: string;
  whyItMatters: string;
}

export interface ProfileMetric {
  id: string;
  profileId: string;
  label: string;
  value: string;
  source: string | null;
}

export interface UnresolvedItem {
  id: string;
  profileId: string;
  section: string;
  description: string;
  optionA: string;
  optionB: string;
  resolution: string | null;
  resolvedAt: string | null;
  priority: string;
}

export interface WritingSample {
  id: string;
  profileId: string;
  title: string;
  content: string;
  context: string | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  github: string | null;
  currentTitle: string | null;
  reportsTo: string | null;
  positioningStatements: string[];
  selfDescribedStrengths: string[];
  technicalInventory: string | null;
  educationCredentials: string | null;
  recognitionPresence: string | null;
  operatingPrinciples: string[];
  writingStyle: string | null;
  selfDescribedPosture: string | null;
  searchTargetLevel: string | null;
  searchGeography: string | null;
  searchCompanies: string[];
  searchFirms: string[];
  resumeOperatingRules: string[];
  knownGaps: string | null;
  personalBackground: string | null;
  careerRoles: CareerRole[];
  signatureStories: SignatureStory[];
  profileMetrics: ProfileMetric[];
  unresolvedItems: UnresolvedItem[];
  writingSamples: WritingSample[];
}
