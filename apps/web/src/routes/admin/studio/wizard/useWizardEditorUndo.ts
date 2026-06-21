import { useCallback } from "react";
import type { PageConfig } from "@pumpstation/contracts";
import type { StrelaAppearance } from "@/lib/strela/appearance";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import type { WizardNavState } from "./wizardTypes";

export type WizardEditorSnapshot = {
  nav: WizardNavState;
  draftPage: PageConfig;
  appearance: StrelaAppearance;
};

export function useWizardEditorUndo(initial: WizardEditorSnapshot) {
  const { state, setState, undo, redo, reset, canUndo, canRedo } = useUndoRedo(initial);

  const patch = useCallback(
    (updater: (prev: WizardEditorSnapshot) => WizardEditorSnapshot, recordHistory = true) => {
      setState(updater, recordHistory);
    },
    [setState],
  );

  const setNav = useCallback(
    (next: WizardNavState | ((prev: WizardNavState) => WizardNavState), recordHistory = true) => {
      patch(
        (prev) => ({
          ...prev,
          nav: typeof next === "function" ? next(prev.nav) : next,
        }),
        recordHistory,
      );
    },
    [patch],
  );

  const setDraftPage = useCallback(
    (next: PageConfig | ((prev: PageConfig) => PageConfig), recordHistory = true) => {
      patch(
        (prev) => ({
          ...prev,
          draftPage: typeof next === "function" ? next(prev.draftPage) : next,
        }),
        recordHistory,
      );
    },
    [patch],
  );

  const setAppearanceDraft = useCallback(
    (
      next: StrelaAppearance | ((prev: StrelaAppearance) => StrelaAppearance),
      recordHistory = true,
    ) => {
      patch(
        (prev) => ({
          ...prev,
          appearance: typeof next === "function" ? next(prev.appearance) : next,
        }),
        recordHistory,
      );
    },
    [patch],
  );

  return {
    nav: state.nav,
    draftPage: state.draftPage,
    appearanceDraft: state.appearance,
    patch,
    setNav,
    setDraftPage,
    setAppearanceDraft,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
}
