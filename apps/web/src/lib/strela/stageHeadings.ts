import type { BrandingConfig } from "@/api/config";
import type { WizardStepId } from "@/stores/wizardStore";

export type StrelaStageKey = "category" | "hm_line" | "pu_line" | "pu_subtype";

const STEP_TO_STAGE: Partial<Record<WizardStepId, StrelaStageKey>> = {
  "product-class": "category",
  "hm-line": "hm_line",
  "pu-line": "pu_line",
  "simpel-line": "category",
  "installation-type": "pu_subtype",
};

export function resolveStrelaStageHeading(
  step: WizardStepId,
  branding: BrandingConfig,
): { title: string; subtitle?: string } {
  const stage = STEP_TO_STAGE[step];
  const headings = branding.appearance?.stage_headings;
  const titles = branding.appearance?.selection_stage_titles;

  if (stage && headings?.[stage]) {
    const subtitle =
      stage === "pu_subtype" && titles?.pu_subtype?.subtitle
        ? titles.pu_subtype.subtitle
        : stage === "category"
          ? branding.copy?.homeSubtitle
          : undefined;
    return {
      title: headings[stage]!,
      subtitle:
        subtitle ??
        (stage === "pu_line"
          ? "Далее уточните тип сети — хоз-пит или ПНС"
          : stage === "pu_subtype"
            ? "Выберите назначение установки"
            : branding.copy?.homeSubtitle),
    };
  }

  switch (step) {
    case "product-class":
      return {
        title: branding.appTitle,
        subtitle: branding.copy?.homeSubtitle,
      };
    case "hm-line":
      return {
        title: "Линейка гидромодулей BPS–C",
        subtitle: "Выберите исполнение",
      };
    case "pu-line":
      return {
        title: "Линейка насосных установок",
        subtitle: "Далее уточните тип сети — хоз-пит или ПНС",
      };
    case "simpel-line":
      return {
        title: "Насосы Simpel",
        subtitle: "Выберите серию",
      };
    case "installation-type":
      return {
        title: "Тип установки",
        subtitle: "Выберите назначение установки",
      };
    default:
      return { title: branding.appTitle };
  }
}
