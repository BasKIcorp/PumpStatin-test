import { SelectionFormProvider } from "./selectionForm/SelectionFormContext";
import {
  SelectionCurvesPanel,
  SelectionOptionsPanel,
  SelectionParamsPanel,
  SelectionResultsPanel,
  SelectionTechSpecsPanel,
  SelectionWorkHeaderBlock,
} from "./selectionForm/selectionFormPanels";

/** Монолитная форма подбора (legacy fallback) */
export function StrelaSelectionFormStep() {
  return (
    <SelectionFormProvider>
      <div
        className="selection-work-root flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--funnel-page-bg)]"
        style={{ fontFamily: "var(--funnel-font-body)" }}
      >
        <SelectionWorkHeaderBlock />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 sm:px-4 lg:px-6">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:hidden">
            <SelectionParamsPanel />
            <SelectionCurvesPanel />
            <SelectionTechSpecsPanel />
            <SelectionOptionsPanel />
            <SelectionResultsPanel />
          </div>

          <div className="hidden min-h-0 flex-1 flex-col font-sans text-[var(--funnel-text)] lg:flex">
            <div className="grid h-full min-h-0 w-full max-w-[1440px] grid-rows-[minmax(0,1.06fr)_minmax(0,0.94fr)] items-stretch gap-x-3 gap-y-2 xl:mx-auto [grid-template-columns:minmax(0,1.95fr)_minmax(0,2.75fr)]">
              <SelectionParamsPanel />
              <div className="flex h-full min-h-0 min-w-0 items-stretch gap-3">
                <SelectionCurvesPanel className="min-h-0 min-w-0 flex-[1.71]" />
                <SelectionTechSpecsPanel className="h-full min-w-0 flex-[1]" />
              </div>
              <SelectionOptionsPanel />
              <SelectionResultsPanel />
            </div>
          </div>
        </div>
      </div>
    </SelectionFormProvider>
  );
}
