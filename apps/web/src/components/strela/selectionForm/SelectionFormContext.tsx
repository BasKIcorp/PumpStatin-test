import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { mapLegacyParameters } from "@/lib/evaluateWhen";
import { useWizardStore } from "@/stores/wizardStore";
import { matchPumps, buildStation, generatePdf } from "@/api/selection";
import type { FlowConfig } from "@/types/wizard";
import { SELECTION_FLOW_HEADER_BRAND_DEFAULT_SRC } from "@/lib/strela/selectionAssets";

export interface PumpCandidate {
  id: string;
  name: string;
  score?: number;
  powerKw?: number;
  nominal_flow?: number;
  nominal_head?: number;
  curve?: Array<{ Q: number; H: number }>;
  q_eta?: Array<number | null>;
  eta_s?: Array<number | null>;
  q_p2?: Array<number | null>;
  p2_s?: Array<number | null>;
  q_npsh?: Array<number | null>;
  npsh_s?: Array<number | null>;
  parabola?: Array<{ Q: number; H: number }>;
  parabola_intersection?: { Q: number; H: number };
}

export interface SelectionFormContextValue {
  flow: FlowConfig;
  formValues: Record<string, unknown>;
  setFormValue: (id: string, value: unknown) => void;
  resetForm: () => void;
  matchedPumps: PumpCandidate[];
  stationResult: unknown;
  selectedPumpId: string | null;
  setSelectedPumpId: (id: string | null) => void;
  error: string;
  busy: boolean;
  pageTitle: string;
  headerLogo: string;
  working: number;
  reserve: number;
  summary?: string;
  goBack: () => void;
  handleMatch: () => Promise<void>;
  handleBuild: () => Promise<void>;
  handlePdf: (docType: "selection" | "tkp" | "techsheet", fileName: string) => Promise<void>;
  canBuild: boolean;
}

const SelectionFormContext = createContext<SelectionFormContextValue | null>(null);

export function useSelectionForm() {
  const ctx = useContext(SelectionFormContext);
  if (!ctx) {
    throw new Error("useSelectionForm must be used within SelectionFormProvider");
  }
  return ctx;
}

export function SelectionFormProvider({ children }: { children: ReactNode }) {
  const { wizard, branding } = useProfile();
  const appearance = branding.appearance;
  const flowId = useWizardStore((s) => s.flowId) ?? "bps-w-domestic";
  const productLine = useWizardStore((s) => s.productLine);
  const puLine = useWizardStore((s) => s.puLine);
  const hmLine = useWizardStore((s) => s.hmLine);
  const productClass = useWizardStore((s) => s.productClass);
  const formValues = useWizardStore((s) => s.formValues);
  const matchedPumps = useWizardStore((s) => s.matchedPumps);
  const stationResult = useWizardStore((s) => s.stationResult);
  const setFormValue = useWizardStore((s) => s.setFormValue);
  const resetForm = useWizardStore((s) => s.resetForm);
  const setMatchResult = useWizardStore((s) => s.setMatchResult);
  const setStationResult = useWizardStore((s) => s.setStationResult);
  const goBack = useWizardStore((s) => s.goBack);

  const [selectedPumpId, setSelectedPumpId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const flow = useMemo(() => {
    const flows = wizard.flows as Record<string, FlowConfig>;
    return flows[flowId] ?? flows["bps-w-domestic"];
  }, [wizard.flows, flowId]);

  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    for (const section of flow.sections) {
      for (const field of section.fields) {
        if (field.default !== undefined) defaults[field.id] = field.default;
      }
    }
    if (flow.options) {
      for (const field of flow.options.fields) {
        if (field.default !== undefined) defaults[field.id] = field.default;
      }
    }
    for (const [k, v] of Object.entries(defaults)) {
      setFormValue(k, v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  const handleMatch = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const apiProductLine = flow.productLine ?? productLine ?? "bps-w";
      const parameters = mapLegacyParameters(formValues, {
        productLine: apiProductLine,
        puLine,
        hmLine,
        productClass,
      });
      const res = await matchPumps({
        productLine: apiProductLine,
        flowId,
        parameters,
      });
      const pumps = res.pumps as PumpCandidate[];
      setMatchResult(pumps);
      setSelectedPumpId(pumps[0]?.id ?? null);
      setStationResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка подбора");
    } finally {
      setBusy(false);
    }
  }, [
    flow.productLine,
    productLine,
    formValues,
    puLine,
    hmLine,
    productClass,
    flowId,
    setMatchResult,
    setStationResult,
  ]);

  const buildStationForPump = useCallback(
    async (pumpId: string) => {
      setBusy(true);
      setError("");
      try {
        const apiProductLine = flow.productLine ?? productLine ?? "bps-w";
        const parameters = mapLegacyParameters(formValues, {
          productLine: apiProductLine,
          puLine,
          hmLine,
          productClass,
        });
        const res = await buildStation({
          productLine: apiProductLine,
          flowId,
          parameters,
          selectedPumpId: pumpId,
        });
        setStationResult(res);
        return res;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка формирования станции");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [flow.productLine, productLine, formValues, puLine, hmLine, productClass, flowId, setStationResult],
  );

  const handleBuild = useCallback(async () => {
    if (!selectedPumpId) {
      setError("Сначала выберите насос");
      return;
    }
    await buildStationForPump(selectedPumpId);
  }, [selectedPumpId, buildStationForPump]);

  const handlePdfBySelectionId = useCallback(
    async (selectionId: string, docType: "selection" | "tkp" | "techsheet", fileName: string) => {
      setBusy(true);
      setError("");
      try {
        const blob = await generatePdf(selectionId, docType);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка генерации PDF");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const handlePdf = useCallback(
    async (docType: "selection" | "tkp" | "techsheet", fileName: string) => {
      let selectionId = (stationResult as { selectionId?: string } | null)?.selectionId ?? null;
      if (!selectionId) {
        if (!selectedPumpId) {
          setError("Сначала выполните подбор и выберите насос");
          return;
        }
        const built = await buildStationForPump(selectedPumpId);
        selectionId = (built as { selectionId?: string } | null)?.selectionId ?? null;
        if (!selectionId) return;
      }
      await handlePdfBySelectionId(selectionId, docType, fileName);
    },
    [stationResult, selectedPumpId, buildStationForPump, handlePdfBySelectionId],
  );

  const pumps = (matchedPumps ?? []) as PumpCandidate[];
  const summary = (stationResult as { summary?: string })?.summary;
  const working = Number(formValues.workingPumps ?? 1);
  const reserve = Number(formValues.reservePumps ?? 1);
  const headerLogo =
    appearance?.selection_flow_header_logo_url ?? SELECTION_FLOW_HEADER_BRAND_DEFAULT_SRC;
  const pageTitle = `Подбор насосной установки ${(puLine ?? hmLine ?? productLine ?? flow.productLine ?? "BPS-W").toUpperCase()}`;

  const value = useMemo<SelectionFormContextValue>(
    () => ({
      flow,
      formValues,
      setFormValue,
      resetForm: () => {
        resetForm();
        setSelectedPumpId(null);
        setError("");
      },
      matchedPumps: pumps,
      stationResult,
      selectedPumpId,
      setSelectedPumpId,
      error,
      busy,
      pageTitle,
      headerLogo,
      working,
      reserve,
      summary,
      goBack,
      handleMatch,
      handleBuild,
      handlePdf,
      canBuild: Boolean(selectedPumpId),
    }),
    [
      flow,
      formValues,
      setFormValue,
      resetForm,
      pumps,
      stationResult,
      selectedPumpId,
      error,
      busy,
      pageTitle,
      headerLogo,
      working,
      reserve,
      summary,
      goBack,
      handleMatch,
      handleBuild,
      handlePdf,
    ],
  );

  return <SelectionFormContext.Provider value={value}>{children}</SelectionFormContext.Provider>;
}
