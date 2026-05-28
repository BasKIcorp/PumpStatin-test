/** Общие типы API (синхронизировать с OpenAPI при внедрении) */

export interface MatchPumpsRequest {
  productLine: string;
  flowId: string;
  parameters: Record<string, unknown>;
}

export interface PumpCandidate {
  id: string;
  name: string;
  powerKw?: number;
  nominal_flow?: number;
  nominal_head?: number;
  curve?: Array<{ Q: number; H: number }>;
  q_eta?: Array<number | null>;
  eta_s?: Array<number | null>;
  q_p2?: Array<number | null>;
  p2_s?: Array<number | null>;
  q_npsh?: Array<number | null>;
  npsh_s?: Array<number | null>;
  parabola?: Array<{ Q: number; H: number }>;
  parabola_intersection?: { Q: number; H: number };
  eta_at_parabola?: number | null;
  p2_at_parabola?: number | null;
  npsh_at_parabola?: number | null;
  moschnost?: number | null;
}

export interface MatchPumpsResponse {
  pumps: PumpCandidate[];
}

export interface BuildStationRequest {
  productLine: string;
  flowId: string;
  parameters: Record<string, unknown>;
  selectedPumpId: string;
}

export interface BuildStationResponse {
  selectionId: string;
  configuration: Record<string, unknown>;
  summary: string;
}

export interface GeneratePdfRequest {
  selectionId: string;
  docType?: "selection" | "tkp" | "techsheet";
}

export interface SelectionHistoryItem {
  selection_id: string;
  profile_id: string;
  product_line: string;
  flow_id: string;
  selected_pump_id: string;
  summary: string;
  project_id: number | null;
  created_at: string;
  station_payload: Record<string, unknown>;
}

export interface SelectionProjectItem {
  id: number;
  name: string;
  created_at: string;
  selections_count: number;
}

export interface GenerateProjectPdfRequest {
  docType: "tkp" | "techsheet";
  selectionIds?: string[];
}
