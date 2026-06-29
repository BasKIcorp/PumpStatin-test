import { create } from "zustand";
import { persistWizardStep } from "@/lib/wizardPersistence";

export type WizardStepId = string;

interface WizardState {
  step: WizardStepId;
  productClass?: string;
  hmLine?: string;
  puLine?: string;
  simpelLine?: string;
  productLine?: string;
  installationType?: string;
  flowId?: string;
  formValues: Record<string, unknown>;
  matchedPumps: unknown[] | null;
  stationResult: unknown | null;
  setStep: (step: WizardStepId) => void;
  selectCard: (step: WizardStepId, cardId: string, meta?: Record<string, unknown>) => void;
  setFormValue: (fieldId: string, value: unknown) => void;
  resetForm: () => void;
  setMatchResult: (pumps: unknown[]) => void;
  setStationResult: (result: unknown) => void;
  goBack: (nav?: { steps?: Array<{ id: string; parent?: string }> }) => void;
  initFromNavigation: (firstStepId: string) => void;
}

export const useWizardStore = create<WizardState>((set, get) => ({
  step: "product-class",
  formValues: {},
  matchedPumps: null,
  stationResult: null,
  setStep: (step) => {
    set({ step });
    try {
      const profileId = sessionStorage.getItem("pumpstation-wizard-profile");
      if (profileId) persistWizardStep(profileId, step);
    } catch {
      /* ignore */
    }
  },
  initFromNavigation: (firstStepId) => set({ step: firstStepId }),
  selectCard: (step, cardId, meta = {}) => {
    const patch: Partial<WizardState> = { ...meta };
    if (step === "product-class") patch.productClass = cardId;
    if (step === "hm-line") patch.hmLine = cardId;
    if (step === "pu-line") {
      patch.puLine = cardId;
    }
    if (step === "product-line") patch.productLine = cardId;
    if (step === "simpel-line") patch.simpelLine = cardId;
    if (step === "installation-type") {
      patch.installationType = cardId;
      if (meta.flow) patch.flowId = String(meta.flow);
    }
    if ((step === "hm-line" || step === "simpel-line") && meta.flow) {
      patch.flowId = String(meta.flow);
    }
    const next = meta.next as WizardStepId | undefined;
    if (next) {
      patch.step = next;
      try {
        const profileId = sessionStorage.getItem("pumpstation-wizard-profile");
        if (profileId) persistWizardStep(profileId, next);
      } catch {
        /* ignore */
      }
    }
    set(patch);
  },
  setFormValue: (fieldId, value) =>
    set((s) => ({ formValues: { ...s.formValues, [fieldId]: value } })),
  resetForm: () =>
    set({ formValues: {}, matchedPumps: null, stationResult: null }),
  setMatchResult: (pumps) => set({ matchedPumps: pumps }),
  setStationResult: (result) => set({ stationResult: result }),
  goBack: (nav) => {
    const { step } = get();
    let prevStep: WizardStepId | undefined;
    if (nav?.steps) {
      const current = nav.steps.find((s) => s.id === step);
      if (current?.parent) {
        prevStep = current.parent;
      }
    }
    if (!prevStep) {
      const legacy: Record<string, WizardStepId> = {
        "selection-form": "installation-type",
        "installation-type": "pu-line",
        "pu-line": "product-class",
        "hm-line": "product-class",
        "simpel-line": "product-class",
        "product-line": "product-class",
      };
      prevStep = legacy[step];
    }
    if (!prevStep) return;
    set({ step: prevStep });
    try {
      const profileId = sessionStorage.getItem("pumpstation-wizard-profile");
      if (profileId) persistWizardStep(profileId, prevStep);
    } catch {
      /* ignore */
    }
  },
}));
