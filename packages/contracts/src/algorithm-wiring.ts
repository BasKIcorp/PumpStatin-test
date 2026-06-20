/** Декларативная проводка алгоритма во фронт (algorithm/wiring.yaml) */

export interface WiringSource {
  source?: string;
  flowRef?: string;
}

export interface WiringFrom {
  from?: string;
}

export interface WiringAction {
  method?: string;
  path?: string;
  input?: string | Record<string, unknown>;
  loadingKey?: string;
  requires?: string[];
}

export interface FieldMapping {
  from?: string;
  type?: string;
  default?: unknown;
  when?: Record<string, unknown>;
  lookup?: string;
}

export interface DisplayColumn {
  path: string;
  label: string;
}

export interface DisplayChart {
  path: string;
  preset: string;
  label: string;
}

export interface DisplayCatalogEntry {
  columns?: DisplayColumn[];
  charts?: DisplayChart[];
  fields?: Array<{ path: string; label: string; type?: string }>;
}

export interface BlockRoleSpec {
  types: string[];
  requiredBinding: string[];
}

export interface AlgorithmWiring {
  version: number;
  algorithmId: string;
  state?: {
    inputs?: Record<string, WiringSource>;
    outputs?: Record<string, WiringFrom>;
  };
  actions?: Record<string, WiringAction>;
  parameters?: {
    schema: string;
    mapping: Record<string, FieldMapping>;
  };
  lookups?: Record<string, Record<string, unknown>>;
  displayCatalog?: Record<string, DisplayCatalogEntry>;
  blockRoles?: Record<string, BlockRoleSpec>;
}
