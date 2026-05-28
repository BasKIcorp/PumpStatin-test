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
