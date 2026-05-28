import { create } from "zustand";

export type WizardStepId =
  | "product-class"
  | "hm-line"
  | "pu-line"
  | "simpel-line"
  | "installation-type"
  | "selection-form";

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
  goBack: () => void;
}

const BACK_MAP: Partial<Record<WizardStepId, WizardStepId>> = {
  "hm-line": "product-class",
  "pu-line": "product-class",
  "simpel-line": "product-class",
  "installation-type": "pu-line",
  "selection-form": "installation-type",
};

export const useWizardStore = create<WizardState>((set, get) => ({
  step: "product-class",
  formValues: {},
  matchedPumps: null,
  stationResult: null,
  setStep: (step) => set({ step }),
  selectCard: (step, cardId, meta = {}) => {
    const patch: Partial<WizardState> = { ...meta };
    if (step === "product-class") patch.productClass = cardId;
    if (step === "hm-line") patch.hmLine = cardId;
    if (step === "pu-line") {
      patch.puLine = cardId;
      patch.productLine = cardId;
    }
    if (step === "simpel-line") patch.simpelLine = cardId;
    if (step === "product-line") patch.productLine = cardId;
    if (step === "installation-type") {
      patch.installationType = cardId;
      if (meta.flow) patch.flowId = String(meta.flow);
    }
    if ((step === "hm-line" || step === "simpel-line") && meta.flow) {
      patch.flowId = String(meta.flow);
    }
    const next = meta.next as WizardStepId | undefined;
    if (next) patch.step = next;
    set(patch);
  },
  setFormValue: (fieldId, value) =>
    set((s) => ({ formValues: { ...s.formValues, [fieldId]: value } })),
  resetForm: () =>
    set({ formValues: {}, matchedPumps: null, stationResult: null }),
  setMatchResult: (pumps) => set({ matchedPumps: pumps }),
  setStationResult: (result) => set({ stationResult: result }),
  goBack: () => {
    const { step, productClass } = get();
    if (step === "selection-form") {
      if (productClass === "hydromodules") {
        set({ step: "hm-line" });
        return;
      }
      if (productClass === "simpel") {
        set({ step: "simpel-line" });
        return;
      }
    }
    const prev = BACK_MAP[step];
    if (prev) set({ step: prev });
  },
}));
