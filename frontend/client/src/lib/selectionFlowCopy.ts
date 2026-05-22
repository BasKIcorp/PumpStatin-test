import type { SelectionStageTitles, StageHeadingsFlat } from "@/lib/api";

export type { StageHeadingsFlat };

/** Шаги воронки до экрана параметров */
export type SelectionFunnelStep =
  | "category"
  | "hm_line"
  | "pu_line"
  | "pu_subtype"
  | "simpel_series";

/** Встроенные заголовки, если в API пусто */
export const BUILTIN_SELECTION_TITLES: Record<
  SelectionFunnelStep,
  { title: string; subtitle: string }
> = {
  category: {
    title: "Подбор насосного оборудования Стрела",
    subtitle: "Этап 1: выберите класс продукции из карточек",
  },
  hm_line: {
    title: "Выберите линейку гидромодуля",
    subtitle: "Серия BPS-C для систем вентиляции и кондиционирования",
  },
  pu_line: {
    title: "Выберите линейку насосной установки",
    subtitle: "Далее уточните тип сети — хоз-пит или ПНС",
  },
  pu_subtype: {
    title: "Тип насосной установки",
    subtitle: "Выберите назначение установки",
  },
  simpel_series: {
    title: "Подбор насосного оборудования Simpel",
    subtitle: "Выберите тип насоса для продолжения подбора",
  },
};

export function flowStepToFunnelSlide(
  step: SelectionFunnelStep,
): 1 | 2 | 3 | 4 | null {
  if (step === "category") return 1;
  if (step === "hm_line") return 2;
  if (step === "pu_line" || step === "pu_subtype") return 3;
  if (step === "simpel_series") return 4;
  return null;
}

const STAGE_KEY: Record<SelectionFunnelStep, keyof SelectionStageTitles> = {
  category: "category",
  hm_line: "hm_line",
  pu_line: "pu_line",
  pu_subtype: "pu_subtype",
  simpel_series: "simpel_series",
};

export function resolvedSelectionTitle(
  step: SelectionFunnelStep,
  overrides: SelectionStageTitles | null | undefined,
  brandIsSimpel: boolean,
  flatHeadings?: StageHeadingsFlat | null,
): { title: string; subtitle: string } {
  const built = BUILTIN_SELECTION_TITLES[step];
  let title = built.title;
  let subtitle = built.subtitle;
  if (step === "category" && brandIsSimpel) {
    title = "Подбор насосного оборудования Simpel";
  }
  const key = STAGE_KEY[step];
  if (step !== "simpel_series") {
    const flat = flatHeadings?.[key]?.trim();
    if (flat) title = flat;
  }
  const o = overrides?.[key];
  if (o?.title?.trim()) title = o.title.trim();
  if (o?.subtitle?.trim()) subtitle = o.subtitle.trim();
  return { title, subtitle };
}
