/**
 * Модель маршрута подбора (согласовано с station_type в API расчёта станции).
 */

export type ProductCategory = "hydromodule" | "pump_unit" | "aupd" | "simpel_pumps";

export type HydromoduleLineId = "bps-c-pro" | "bps-c-lite" | "bps-c-e" | "bps-c-mini" | "bps-c-j";

/** Код линейки НУ приходит с API `/api/pump-unit-lines` */
export type PumpUnitLineCode = string;

export type StationTypeCode = "гм" | "хоз-пит" | "пнс";

export const HYDROMODULE_LINE_LABELS: Record<HydromoduleLineId, string> = {
  "bps-c-pro": "BPS–C Pro",
  "bps-c-lite": "BPS–C Lite",
  "bps-c-e": "BPS–CE",
  "bps-c-mini": "BPS–C mini",
  "bps-c-j": "BPS–CJ",
};

/** Имя поля FormData при загрузке карточки в POST /api/admin/appearance?site= */
export const HYDROMODULE_CARD_FORM_FIELD: Record<HydromoduleLineId, string> = {
  "bps-c-pro": "hm_card_bps_c_pro",
  "bps-c-lite": "hm_card_bps_c_lite",
  "bps-c-e": "hm_card_bps_c_e",
  "bps-c-mini": "hm_card_bps_c_mini",
  "bps-c-j": "hm_card_bps_c_j",
};

/** Порядок карточек на шаге выбора линейки ГМ */
export const HYDROMODULE_LINE_ORDER: HydromoduleLineId[] = [
  "bps-c-pro",
  "bps-c-lite",
  "bps-c-e",
  "bps-c-mini",
  "bps-c-j",
];

/** station_type для API при фиксированной ветке */
export function stationTypeForRoute(
  category: ProductCategory | null,
  puSubtype: StationTypeCode | null,
): StationTypeCode {
  if (category === "hydromodule") return "гм";
  if (category === "pump_unit") {
    if (puSubtype === "пнс" || puSubtype === "хоз-пит") return puSubtype;
    return "хоз-пит";
  }
  if (category === "simpel_pumps") return "гм";
  return "гм";
}

export function parametersPageTitle(
  category: ProductCategory | null,
  hmLine: HydromoduleLineId | null,
  puLineCode: PumpUnitLineCode | null,
  pumpTypeCode: string | null,
  puLineLabel?: string | null,
): string {
  if (category === "hydromodule" && hmLine) {
    return `Подбор гидромодуля ${HYDROMODULE_LINE_LABELS[hmLine]}`;
  }
  if (category === "pump_unit" && puLineCode) {
    const label = (puLineLabel && puLineLabel.trim()) || puLineCode;
    return `Подбор насосной установки ${label}`;
  }
  if (category === "simpel_pumps" && pumpTypeCode) {
    return `Подбор насосов ${pumpTypeCode}`;
  }
  return "Подбор насосного оборудования";
}
