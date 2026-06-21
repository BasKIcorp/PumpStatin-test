import { apiFetch } from "@/api/client";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import type { StrelaAppearance } from "@/lib/strela/appearance";
import type { WizardNavState } from "@/routes/admin/studio/wizard/wizardTypes";
import {
  navWithCardsFromBlocks,
  persistNormalizedWizardPage,
} from "@/routes/admin/studio/wizard/wizardUnifiedBlocks";

export type WizardSavePhase = "wizard" | "site" | "branding";

export class WizardSaveError extends Error {
  phase: WizardSavePhase;
  cause?: unknown;

  constructor(phase: WizardSavePhase, message: string, cause?: unknown) {
    super(message);
    this.name = "WizardSaveError";
    this.phase = phase;
    this.cause = cause;
  }
}

export function wizardSavePhaseLabel(phase: WizardSavePhase): string {
  switch (phase) {
    case "wizard":
      return "навигация визарда";
    case "site":
      return "макет (blocks)";
    case "branding":
      return "оболочка (branding)";
  }
}

export async function saveWizardBundle(params: {
  profileId: string;
  nav: WizardNavState;
  wizardPageDraft?: PageConfig;
  appearanceDraft?: StrelaAppearance;
  layout: SiteConfig["layout"];
  pages: PageConfig[];
  routing: SiteConfig["routing"];
  branding: Record<string, unknown>;
  saveSite: boolean;
  saveAppearance: boolean;
}): Promise<{ completedPhases: WizardSavePhase[]; nav: WizardNavState }> {
  const {
    profileId,
    nav,
    wizardPageDraft,
    appearanceDraft,
    layout,
    pages,
    routing,
    branding,
    saveSite,
    saveAppearance,
  } = params;

  const completedPhases: WizardSavePhase[] = [];
  const base = `/api/v1/admin/profiles/${encodeURIComponent(profileId)}`;

  const wizardPageForNav =
    wizardPageDraft?.type === "wizard"
      ? wizardPageDraft
      : pages.find((p) => p.type === "wizard");
  const navToSave = navWithCardsFromBlocks(nav, wizardPageForNav);

  try {
    await apiFetch(`${base}/wizard`, {
      method: "PUT",
      body: JSON.stringify({
        navigation: { steps: navToSave.steps, cards: navToSave.cards },
        flows: navToSave.flows ?? {},
      }),
    });
    completedPhases.push("wizard");
  } catch (e) {
    throw new WizardSaveError(
      "wizard",
      `Не удалось сохранить ${wizardSavePhaseLabel("wizard")}`,
      e,
    );
  }

  if (saveSite && wizardPageDraft) {
    const persistedPage =
      wizardPageDraft.type === "wizard"
        ? persistNormalizedWizardPage(wizardPageDraft)
        : wizardPageDraft;
    const nextPages = pages.map((p) => (p.id === wizardPageDraft.id ? persistedPage : p));
    try {
      await apiFetch(`${base}/site`, {
        method: "PUT",
        body: JSON.stringify({ layout, pages: nextPages, routing }),
      });
      completedPhases.push("site");
    } catch (e) {
      throw new WizardSaveError(
        "site",
        `Сохранена ${wizardSavePhaseLabel("wizard")}, но не удалось сохранить ${wizardSavePhaseLabel("site")}. Перезагрузите профиль и повторите.`,
        e,
      );
    }
  }

  if (saveAppearance && appearanceDraft) {
    try {
      await apiFetch(`${base}/branding`, {
        method: "PUT",
        body: JSON.stringify({
          branding: { ...branding, appearance: appearanceDraft },
        }),
      });
      completedPhases.push("branding");
    } catch (e) {
      throw new WizardSaveError(
        "branding",
        `Сохранены ${completedPhases.map(wizardSavePhaseLabel).join(" и ")}, но не удалось сохранить ${wizardSavePhaseLabel("branding")}. Перезагрузите профиль и повторите.`,
        e,
      );
    }
  }

  return { completedPhases, nav: navToSave };
}
