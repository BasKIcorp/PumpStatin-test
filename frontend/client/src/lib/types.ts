// Pump interface matching the API response
export interface Pump {
  id: number;
  naimenovanie: string;
  Q_base: number; // Base flow rate in m³/h
  H_base: number; // Base head in meters
  curve: { Q: number; H: number }[];
  additional_curves?: CurvePoint[][];
  q_p2?: (number | null)[] | null;
  p2_s?: (number | null)[] | null;
  q_eta?: (number | null)[] | null;
  eta_s?: (number | null)[] | null;
  q_npsh?: (number | null)[] | null;
  npsh_s?: (number | null)[] | null;
  // New fields for parabola and additional curves
  parabola?: { Q: number; H: number }[];
  parabola_intersection?: { Q: number; H: number };
  eta_at_parabola?: number | null;
  npsh_at_parabola?: number | null;
  p2_at_parabola?: number | null;
  moschnost?: number | null;
  additional_curves_eta?: { Q: number; eta: number }[][];
  additional_curves_p2?: { Q: number; P2: number }[][];
  additional_curves_npsh?: { Q: number; NPSH: number }[][];
  // Add any other properties that come from the API
}
export type CurvePoint = {
  Q: number;
  H: number;
};
// Station configuration result interface
export interface StationResult {
  station_name?: string;
  pumps?: string;
  control?: string;
  options?: {
    Фильтр?: string;
    Кожух?: string;
    "Предохранительный клапан"?: string;
    Виброкомпенсаторы?: string;
    Виброопоры?: string;
    "Буферный бак"?: string;
    "Расширительный бак"?: string;
    "Материал коллектора"?: string;
    Изоляция?: string;
    [key: string]: string | undefined;
  };
  estimated_price?: number;
  price?: number;
  weight?: number;
  name?: string;
  code?: string;
  length?: number;
  width?: number;
  height?: number;
}
