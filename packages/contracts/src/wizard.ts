import type { SelectionParametersV2 } from "./selection.js";

export type FieldType =
  | "number"
  | "text"
  | "select"
  | "readonly"
  | "checkbox"
  | "computed";

export interface ValidationRule {
  min?: number;
  max?: number;
  gt?: number;
  gte?: number;
  required?: boolean;
}

export interface WhenRule {
  [key: string]: unknown | { not?: unknown; in?: unknown[] };
}

export interface WizardFieldBinding {
  id: string;
  bind?: keyof SelectionParametersV2 | string;
  type: FieldType;
  label?: string;
  source?: string;
  visibleWhen?: WhenRule;
  disabledWhen?: WhenRule;
  constraints?: ValidationRule[];
  default?: unknown;
}

export interface CatalogSource {
  key: string;
  label: string;
  items: Array<{ value: string; label: string }>;
}
