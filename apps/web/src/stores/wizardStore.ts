import { create } from "zustand";

export type WizardStepId =
  | "product-class"
  | "product-line"
  | "installation-type"
  | "selection-form";

interface WizardState {
  step: WizardStepId;
  productClass?: string;
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
  "product-line": "product-class",
  "installation-type": "product-line",
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
    if (step === "product-line") patch.productLine = cardId;
    if (step === "installation-type") {
      patch.installationType = cardId;
      if (meta.flow) patch.flowId = String(meta.flow);
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
    const prev = BACK_MAP[get().step];
    if (prev) set({ step: prev });
  },
}));
