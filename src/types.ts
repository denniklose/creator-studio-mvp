export type NavKey = 'today' | 'library' | 'analysis' | 'studio' | 'exports';

export type Stage = 'Idee' | 'Skript' | 'Szenen' | 'Stimme' | 'Prüfung';

export type OutputMode = 'record' | 'faceless';

export interface Scene {
  id: number;
  label: string;
  duration: string;
  asset: string;
  script: string;
  generationHint: string;
}

export interface CreatorProfile {
  projectName: string;
  niche: string;
  audience: string;
  tone: string;
  goal: string;
}

export interface ImportedAsset {
  id: string;
  name: string;
  size: string;
  kind: string;
}
