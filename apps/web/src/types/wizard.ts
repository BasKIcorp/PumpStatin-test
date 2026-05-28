export interface WizardCard {
  id: string;
  title: string;
  description: string;
  enabled?: boolean;
  next?: string;
  flow?: string;
}

export interface NavigationConfig {
  steps: Array<{ id: string; type: string; title?: string }>;
  cards: Record<string, WizardCard[]>;
}

export interface FlowField {
  id: string;
  type: string;
  label: string;
  default?: unknown;
  min?: number;
  max?: number;
  required?: boolean;
  source?: string;
}

export interface FlowConfig {
  id: string;
  sections: Array<{ id: string; title: string; fields: FlowField[] }>;
  options?: { title: string; fields: FlowField[] };
  actions: Record<string, { label: string; api?: string; requires?: string }>;
  result: Record<string, string>;
  pdf?: { enabled: boolean; label: string };
}
