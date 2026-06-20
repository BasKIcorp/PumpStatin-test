export interface WizardStep {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  titleKey?: string;
  subtitleKey?: string;
  parent?: string;
  when?: Record<string, string>;
  flowRef?: string;
}

export interface CardItem {
  id: string;
  title: string;
  image?: string;
  description?: string;
  enabled: boolean;
  next?: string;
  flow?: string;
}

export interface FlowField {
  id: string;
  type: string;
  label: string;
  source?: string;
  required?: boolean;
  default?: string | number;
  min?: number;
  max?: number;
}

export interface FlowSection {
  id: string;
  title: string;
  fields: FlowField[];
}

export interface FlowConfig {
  id: string;
  productLine: string;
  installationType: string;
  sections: FlowSection[];
}

export interface WizardNavState {
  steps: WizardStep[];
  cards: Record<string, CardItem[]>;
  flows?: Record<string, FlowConfig>;
}

export const STEP_TYPES: Record<string, string> = {
  "card-grid": "Выбор карточек",
  "selection-form": "Форма подбора",
};

export const STEP_ICONS: Record<string, string> = {
  "card-grid": "📋",
  "selection-form": "📝",
};

export const FIELD_TYPES = ["text", "number", "select", "checkbox", "readonly"] as const;

export function flowKeyFromRef(flowRef?: string): string | null {
  if (!flowRef) return null;
  return flowRef.replace(/^flows\//, "").replace(/\.yaml$/, "");
}

export function emptyWizardNav(): WizardNavState {
  return { steps: [], cards: {}, flows: {} };
}

export const CARD_IMAGE_PRESETS: { label: string; url: string }[] = [
  { label: "Подбор 1", url: "/selection-assets/podbor-001.png" },
  { label: "Подбор 2", url: "/selection-assets/podbor-002.png" },
  { label: "Подбор 3", url: "/selection-assets/podbor-003.png" },
  { label: "Подбор 4", url: "/selection-assets/podbor-004.png" },
  { label: "BPS-C Pro", url: "/selection-assets/hm-cards/bps-c-pro.png" },
  { label: "BPS-C Base", url: "/selection-assets/hm-cards/bps-c-base.png" },
];

export function navFromApi(wizard: Record<string, unknown>): WizardNavState {
  const navigation = (wizard.navigation ?? wizard) as Record<string, unknown>;
  const flows = (wizard.flows ?? navigation.flows ?? {}) as Record<string, FlowConfig>;
  return {
    steps: (navigation.steps as WizardStep[]) ?? [],
    cards: (navigation.cards as Record<string, CardItem[]>) ?? {},
    flows,
  };
}
