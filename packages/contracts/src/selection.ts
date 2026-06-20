/** Канонические параметры подбора v2 (синхрон с algorithm-schema.json и Pydantic) */

export type StationType = "BPS-C" | "BPS-W" | "FPS" | "Pump";
export type PumpTypeV2 = "VMIP" | "HMIP" | "COMOS" | "CIVOS";

export interface SelectionParametersV2 {
  station_type: StationType;
  series: string;
  Q: number;
  H: number;
  Hst: number;
  Hgr: number;
  n1: number;
  n2: number;
  med: string;
  c: number;
  t: number;
  pump_type: PumpTypeV2 | string;
  mf?: string;
  include_piping_losses?: boolean;
}

export interface WorkingPoint {
  Q: number;
  H: number;
  P?: number;
  efficiency?: number;
  npsh?: number;
}

export interface CurvePoint {
  Q: number;
  H?: number;
  value?: number;
}

export interface CurveSet {
  qh?: Array<{ Q: number; H: number }>;
  eta?: Array<{ Q: number; value: number }>;
  p2?: Array<{ Q: number; value: number }>;
  npsh?: Array<{ Q: number; value: number }>;
  system?: Array<{ Q: number; H: number }>;
  workingPoint?: WorkingPoint;
}

export interface PumpMatchResultV2 {
  id: string;
  name: string;
  score: number;
  powerKw?: number;
  curves: CurveSet;
  workingPoint?: WorkingPoint;
  rulesVersion?: string;
}

export interface StationBuildResultV2 {
  selectionId: string;
  DN?: number;
  velocity?: number;
  bom?: Array<{ id: string; label: string; qty?: number }>;
  configuration: Record<string, unknown>;
  summary: string;
  curves?: CurveSet;
}
