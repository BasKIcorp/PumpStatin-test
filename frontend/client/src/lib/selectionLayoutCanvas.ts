/** Единые размеры канвы макета этапа «Работа» (админка и рантайм масштабируют пропорционально). */
export const SELECTION_WORK_CANVAS = {
  width: 1200,
  height: 720,
} as const;

export type SelectionWorkSlotType =
  | "work_pump_search"
  | "work_curves"
  | "work_tech_specs"
  | "work_station_config"
  | "work_pumps_list"
  | "work_station_results";

export const WORK_SLOT_COMPONENT_TYPES: {
  type: SelectionWorkSlotType;
  label: string;
  icon: string;
  defaultW: number;
  defaultH: number;
}[] = [
  { type: "work_pump_search", label: "Параметры подбора", icon: "□", defaultW: 520, defaultH: 280 },
  { type: "work_curves", label: "Кривые характеристик", icon: "📈", defaultW: 560, defaultH: 340 },
  { type: "work_tech_specs", label: "Теххарактеристики и PDF", icon: "⚙", defaultW: 280, defaultH: 320 },
  { type: "work_station_config", label: "Конфигурация станции", icon: "▤", defaultW: 520, defaultH: 360 },
  { type: "work_pumps_list", label: "Список насосов", icon: "⊞", defaultW: 560, defaultH: 360 },
  { type: "work_station_results", label: "Результат расчёта", icon: "≡", defaultW: 560, defaultH: 200 },
];

export function defaultAbsoluteGrid() {
  return {
    absolute: true,
    canvasWidth: SELECTION_WORK_CANVAS.width,
    canvasHeight: SELECTION_WORK_CANVAS.height,
  };
}

export function isAbsoluteLayout(grid: Record<string, unknown> | null | undefined): boolean {
  return Boolean(grid && typeof grid === "object" && (grid as { absolute?: boolean }).absolute === true);
}

/** Маппинг устаревших типов блоков → слоты этапа работы. */
export function legacyComponentTypeToSlot(type: string): SelectionWorkSlotType | null {
  const m: Record<string, SelectionWorkSlotType> = {
    pump_table: "work_pumps_list",
    chart_block: "work_curves",
    station_result: "work_station_results",
    pump_search_legacy: "work_pump_search",
  };
  return m[type] ?? (WORK_SLOT_COMPONENT_TYPES.some((w) => w.type === type) ? (type as SelectionWorkSlotType) : null);
}
