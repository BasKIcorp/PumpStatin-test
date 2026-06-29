import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PageConfig, SiteConfig } from "@pumpstation/contracts";
import { applyStrelaAppearance, type StrelaAppearance } from "@/lib/strela/appearance";
import type { ProfileBundle } from "@/api/config";
import { wizardBundleFingerprint } from "@/routes/admin/studio/studioDraftUtils";
import { WizardNavPanel } from "./panels/WizardNavPanel";
import { WizardCardPanel, WizardCardToolbar } from "./panels/WizardCardPanel";
import { WizardFlowPanel, WizardFlowFieldEditor } from "./panels/WizardFlowPanel";
import { PageRoutingPanel } from "@/routes/admin/studio/properties/PageRoutingPanel";
import { WizardUnifiedPageEditor } from "./WizardUnifiedPageEditor";
import { useWizardEditorUndo } from "./useWizardEditorUndo";
import {
  type CardItem,
  type FlowConfig,
  type WizardNavState,
  type WizardStep,
  STEP_TYPES,
  flowKeyFromRef,
} from "./wizardTypes";
import {
  addCardBlockToUnifiedStep,
  blocksForWizardStep,
  normalizeWizardPage,
  navWithCardsFromBlocks,
  patchWizardStepBlocks,
  persistNormalizedWizardPage,
  removeCardBlockFromUnifiedStep,
  removeStepBlocksFromPage,
  syncWizardUnifiedPageBlocks,
} from "./wizardUnifiedBlocks";
import {
  appearancePatchFromWizardBlocks,
  defaultFrameBlocks,
  WIZARD_FUNNEL_HEADING,
  WIZARD_SELECTION_CARD,
} from "./wizardFrameUtils";
import { FIGMA } from "../figma/figmaTokens";
import { WizardStudioContext } from "./WizardStudioContext";

const EMPTY_APPEARANCE = {} as StrelaAppearance;

export function WizardUnifiedStudioEditor({
  page,
  site,
  profileBundle,
  initialNav,
  onSave,
  onDirtyChange,
  onRegisterSave,
  onDraftPageChange,
  onNavDraftChange,
  onPreviewStepChange,
  onAppearanceDraftChange,
  previewStepId,
  savedBundleFingerprint = "",
}: {
  page: PageConfig;
  site: SiteConfig;
  profileBundle: ProfileBundle;
  initialNav: WizardNavState;
  onSave: (
    nav: WizardNavState,
    pageDraft?: PageConfig,
    appearance?: StrelaAppearance,
    options?: { saveSite?: boolean; saveAppearance?: boolean },
  ) => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSave?: (fn: () => Promise<void>) => void;
  onDraftPageChange?: (page: PageConfig) => void;
  onNavDraftChange?: (nav: WizardNavState) => void;
  onPreviewStepChange?: (stepId: string) => void;
  onAppearanceDraftChange?: (appearance: StrelaAppearance) => void;
  previewStepId?: string;
  savedBundleFingerprint?: string;
}) {
  const normalizedInitialPage = useMemo(() => persistNormalizedWizardPage(normalizeWizardPage(page)), [page]);
  const initialAppearance = (profileBundle.branding.appearance ?? EMPTY_APPEARANCE) as StrelaAppearance;
  const isStrelaFunnel =
    (profileBundle.branding as { layoutVariant?: string }).layoutVariant === "strela-funnel";

  const {
    nav,
    draftPage,
    appearanceDraft,
    patch: patchEditor,
    setNav,
    setDraftPage,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  } = useWizardEditorUndo({
    nav: initialNav,
    draftPage: normalizedInitialPage,
    appearance: initialAppearance,
  });

  const [selectedStepId, setSelectedStepId] = useState<string | null>(initialNav.steps[0]?.id ?? null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewStep, setPreviewStepState] = useState(
    previewStepId ?? initialNav.steps[0]?.id ?? "product-class",
  );

  const serverNavKeyRef = useRef("");
  const serverPageFpRef = useRef("");
  const onDraftPageChangeRef = useRef(onDraftPageChange);
  const onNavDraftChangeRef = useRef(onNavDraftChange);
  const onPreviewStepChangeRef = useRef(onPreviewStepChange);
  const onAppearanceDraftChangeRef = useRef(onAppearanceDraftChange);
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDraftPageChangeRef.current = onDraftPageChange;
  onNavDraftChangeRef.current = onNavDraftChange;
  onPreviewStepChangeRef.current = onPreviewStepChange;
  onAppearanceDraftChangeRef.current = onAppearanceDraftChange;
  onDirtyChangeRef.current = onDirtyChange;

  const setPreviewStep = useCallback((stepId: string) => {
    setPreviewStepState(stepId);
    onPreviewStepChangeRef.current?.(stepId);
  }, []);

  useEffect(() => {
    if (previewStepId && previewStepId !== previewStep) {
      setPreviewStepState(previewStepId);
      setSelectedStepId(previewStepId);
    }
  }, [previewStepId, previewStep]);

  useEffect(() => {
    if (isStrelaFunnel) applyStrelaAppearance(appearanceDraft);
  }, [appearanceDraft, isStrelaFunnel]);

  useEffect(() => {
    const fp = JSON.stringify(persistNormalizedWizardPage(normalizeWizardPage(page)));
    if (fp === serverPageFpRef.current) return;
    serverPageFpRef.current = fp;
    setDraftPage(persistNormalizedWizardPage(normalizeWizardPage(page)), false);
  }, [page, setDraftPage]);

  useEffect(() => {
    setDraftPage((prev) => {
      const synced = syncWizardUnifiedPageBlocks(prev, nav.steps, isStrelaFunnel, nav.cards);
      return JSON.stringify(synced) === JSON.stringify(prev) ? prev : synced;
    }, false);
  }, [nav.steps, nav.cards, isStrelaFunnel, setDraftPage]);

  useEffect(() => {
    onDraftPageChangeRef.current?.(draftPage);
  }, [draftPage]);

  useEffect(() => {
    onNavDraftChangeRef.current?.(nav);
  }, [nav]);

  useEffect(() => {
    onPreviewStepChangeRef.current?.(previewStep);
  }, [previewStep]);

  useEffect(() => {
    onAppearanceDraftChangeRef.current?.(appearanceDraft);
  }, [appearanceDraft]);

  useEffect(() => {
    const key = JSON.stringify(initialNav);
    if (key === serverNavKeyRef.current) return;
    serverNavKeyRef.current = key;
    reset({
      nav: navWithCardsFromBlocks(
        initialNav,
        persistNormalizedWizardPage(normalizeWizardPage(page)),
      ),
      draftPage: persistNormalizedWizardPage(normalizeWizardPage(page)),
      appearance: (profileBundle.branding.appearance ?? EMPTY_APPEARANCE) as StrelaAppearance,
    });
    const first = initialNav.steps[0]?.id ?? null;
    setSelectedStepId(first);
    setPreviewStepState(first ?? "product-class");
    setSelectedChildId(null);
    setSelectedBlockId(null);
  }, [initialNav, page, profileBundle.branding.appearance, reset]);

  const selectedStep = nav.steps.find((s) => s.id === selectedStepId);
  const previewStepDef = nav.steps.find((s) => s.id === previewStep);
  const isCardStep = selectedStep?.type === "card-grid";
  const isFormStep = selectedStep?.type === "selection-form";
  const currentCards = selectedStepId ? (nav.cards[selectedStepId] ?? []) : [];
  const flowKey = flowKeyFromRef(selectedStep?.flowRef);
  const currentFlow: FlowConfig | null =
    flowKey && nav.flows ? (nav.flows[flowKey] ?? null) : null;

  const childSortIds = useMemo(() => {
    if (isCardStep) return currentCards.map((c) => `card:${c.id}`);
    if (isFormStep && currentFlow) {
      return currentFlow.sections.flatMap((s) => s.fields.map((f) => `field:${s.id}:${f.id}`));
    }
    return [];
  }, [isCardStep, isFormStep, currentCards, currentFlow]);

  const stepBlocksForPreview = useMemo(
    () => blocksForWizardStep(draftPage, previewStep),
    [draftPage, previewStep],
  );

  const selectBlockForCard = useCallback(
    (cardId: string | null) => {
      if (!cardId) {
        setSelectedChildId(null);
        return;
      }
      setSelectedChildId(cardId);
      const block = stepBlocksForPreview.find(
        (b) => b.type === WIZARD_SELECTION_CARD && String(b.props.cardId) === cardId,
      );
      setSelectedBlockId(block?.id ?? null);
    },
    [stepBlocksForPreview],
  );

  const addStep = useCallback(
    (type: string) => {
      const id = `step-${Date.now()}`;
      const step: WizardStep = {
        id,
        type,
        title: type === "card-grid" ? "Новый выбор" : "Форма подбора",
      };
      patchEditor((prev) => ({
        ...prev,
        nav: {
          ...prev.nav,
          steps: [...prev.nav.steps, step],
          cards: type === "card-grid" ? { ...prev.nav.cards, [id]: [] } : prev.nav.cards,
        },
        draftPage: patchWizardStepBlocks(
          prev.draftPage,
          step.id,
          defaultFrameBlocks(step, isStrelaFunnel, [], undefined),
        ),
      }));
      setSelectedStepId(id);
      setPreviewStep(id);
    },
    [patchEditor, isStrelaFunnel, setPreviewStep],
  );

  const removeStep = useCallback(
    (id: string) => {
      patchEditor((prev) => {
        const { [id]: _removed, ...restCards } = prev.nav.cards;
        return {
          ...prev,
          nav: {
            ...prev.nav,
            steps: prev.nav.steps.filter((s) => s.id !== id),
            cards: restCards,
          },
          draftPage: removeStepBlocksFromPage(prev.draftPage, id),
        };
      });
      if (selectedStepId === id) setSelectedStepId(null);
    },
    [patchEditor, selectedStepId],
  );

  const updateStep = useCallback(
    (id: string, patch: Partial<WizardStep>) => {
      patchEditor((prev) => {
        const nextSteps = prev.nav.steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
        let nextDraftPage = prev.draftPage;
        const updated = nextSteps.find((s) => s.id === id);
        if (patch.type && updated) {
          nextDraftPage = patchWizardStepBlocks(
            nextDraftPage,
            updated.id,
            defaultFrameBlocks(updated, isStrelaFunnel, prev.nav.cards[updated.id] ?? [], undefined),
          );
        }
        if (updated && (patch.title !== undefined || patch.subtitle !== undefined)) {
          const current = blocksForWizardStep(nextDraftPage, id);
          const nextBlocks = current.map((b) =>
            b.type === WIZARD_FUNNEL_HEADING || b.type === "wizard/step-heading"
              ? {
                  ...b,
                  props: {
                    ...b.props,
                    ...(patch.title !== undefined ? { title: patch.title } : {}),
                    ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
                  },
                }
              : b,
          );
          nextDraftPage = patchWizardStepBlocks(nextDraftPage, id, nextBlocks);
        }
        return { ...prev, nav: { ...prev.nav, steps: nextSteps }, draftPage: nextDraftPage };
      });
    },
    [patchEditor, isStrelaFunnel],
  );

  const updateFlow = useCallback(
    (flow: FlowConfig) => {
      setNav((prev) => ({
        ...prev,
        flows: { ...(prev.flows ?? {}), [flow.id]: flow },
      }));
    },
    [setNav],
  );

  const removeFlowField = useCallback(
    (sectionId: string, fieldId: string) => {
      if (!currentFlow) return;
      updateFlow({
        ...currentFlow,
        sections: currentFlow.sections.map((section) =>
          section.id === sectionId
            ? { ...section, fields: section.fields.filter((f) => f.id !== fieldId) }
            : section,
        ),
      });
      if (selectedChildId === fieldId) setSelectedChildId(null);
    },
    [currentFlow, updateFlow, selectedChildId],
  );

  const addCard = useCallback(() => {
    if (!selectedStepId || !previewStepDef) return;
    const card: CardItem = {
      id: `card-${Date.now()}`,
      title: "Новая карточка",
      description: "",
      enabled: true,
    };
    patchEditor((prev) => {
      const stepCards = prev.nav.cards[selectedStepId] ?? [];
      const nextCards = [...stepCards, card];
      return {
        ...prev,
        nav: { ...prev.nav, cards: { ...prev.nav.cards, [selectedStepId]: nextCards } },
        draftPage: addCardBlockToUnifiedStep(prev.draftPage, previewStepDef, nextCards),
      };
    });
    selectBlockForCard(card.id);
  }, [selectedStepId, previewStepDef, patchEditor, selectBlockForCard]);

  const removeCard = useCallback(
    (cardId: string) => {
      if (!selectedStepId || !previewStepDef) return;
      patchEditor((prev) => {
        const stepCards = prev.nav.cards[selectedStepId] ?? [];
        const nextCards = stepCards.filter((c) => c.id !== cardId);
        return {
          ...prev,
          nav: { ...prev.nav, cards: { ...prev.nav.cards, [selectedStepId]: nextCards } },
          draftPage: removeCardBlockFromUnifiedStep(
            prev.draftPage,
            selectedStepId,
            previewStepDef,
            nextCards,
          ),
        };
      });
      if (selectedChildId === cardId) selectBlockForCard(null);
    },
    [selectedStepId, previewStepDef, patchEditor, selectedChildId, selectBlockForCard],
  );

  const moveCard = useCallback(
    (cardId: string, direction: -1 | 1) => {
      if (!selectedStepId || !previewStepDef) return;
      patchEditor((prev) => {
        const stepCards = [...(prev.nav.cards[selectedStepId] ?? [])];
        const index = stepCards.findIndex((c) => c.id === cardId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= stepCards.length) return prev;
        [stepCards[index], stepCards[target]] = [stepCards[target], stepCards[index]];
        return {
          ...prev,
          nav: { ...prev.nav, cards: { ...prev.nav.cards, [selectedStepId]: stepCards } },
          draftPage: addCardBlockToUnifiedStep(prev.draftPage, previewStepDef, stepCards),
        };
      });
    },
    [selectedStepId, previewStepDef, patchEditor],
  );

  const handleSelectStep = useCallback(
    (stepId: string) => {
      setSelectedStepId(stepId);
      setPreviewStep(stepId);
      setSelectedChildId(null);
      setSelectedBlockId(null);
    },
    [setPreviewStep],
  );

  const bundleDirty = useMemo(() => {
    if (!savedBundleFingerprint) return false;
    return wizardBundleFingerprint(nav, draftPage, appearanceDraft) !== savedBundleFingerprint;
  }, [nav, draftPage, appearanceDraft, savedBundleFingerprint]);

  const pageMetaDirty =
    draftPage.route !== page.route ||
    draftPage.title !== page.title ||
    draftPage.inMenu !== page.inMenu;

  const appearanceForSave = useMemo(
    () =>
      isStrelaFunnel
        ? appearancePatchFromWizardBlocks(
            persistNormalizedWizardPage(draftPage),
            appearanceDraft,
          )
        : appearanceDraft,
    [isStrelaFunnel, draftPage, appearanceDraft],
  );

  const appearanceDirty =
    JSON.stringify(appearanceForSave) !== JSON.stringify(initialAppearance);

  const handleSaveClick = useCallback(async () => {
    await onSave(nav, persistNormalizedWizardPage(draftPage), appearanceDirty ? appearanceForSave : undefined, {
      saveSite: bundleDirty || pageMetaDirty,
      saveAppearance: appearanceDirty,
    });
  }, [onSave, nav, draftPage, appearanceDirty, appearanceForSave, bundleDirty, pageMetaDirty]);

  useEffect(() => {
    onRegisterSave?.(handleSaveClick);
  }, [onRegisterSave, handleSaveClick]);

  useEffect(() => {
    onDirtyChangeRef.current?.(bundleDirty || pageMetaDirty);
  }, [bundleDirty, pageMetaDirty]);

  const selectedCard = currentCards.find((c) => c.id === selectedChildId);
  const selectedField =
    currentFlow &&
    currentFlow.sections
      .flatMap((s) => s.fields.map((f) => ({ section: s, field: f })))
      .find(({ field }) => field.id === selectedChildId);

  const layersExtra = (
    <>
      <WizardNavPanel
        nav={nav}
        selectedStepId={selectedStepId}
        onSelectStep={handleSelectStep}
        onRemoveStep={removeStep}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />
      {isCardStep && (
        <WizardCardPanel
          cards={currentCards}
          childSortIds={childSortIds}
          selectedChildId={selectedChildId}
          onSelectCard={selectBlockForCard}
          onAddCard={addCard}
          onRemoveCard={removeCard}
        />
      )}
      {isFormStep && currentFlow && (
        <WizardFlowPanel
          flow={currentFlow}
          childSortIds={childSortIds}
          selectedChildId={selectedChildId}
          onSelectField={(fieldId) => setSelectedChildId(fieldId)}
          onRemoveField={removeFlowField}
        />
      )}
      <div className="space-y-1 border-t border-[#333] pt-3">
        <span className="block px-1 text-[10px] font-semibold uppercase text-[#666]">
          Добавить шаг
        </span>
        <button
          type="button"
          className="w-full rounded px-2 py-1 text-left text-[11px] text-[#aaa] hover:bg-[#383838]"
          onClick={() => addStep("card-grid")}
        >
          + Шаг: карточки
        </button>
        <button
          type="button"
          className="w-full rounded px-2 py-1 text-left text-[11px] text-[#aaa] hover:bg-[#383838]"
          onClick={() => addStep("selection-form")}
        >
          + Шаг: форма
        </button>
      </div>
    </>
  );

  const rightSidebarExtra = (
    <>
      <div className="mb-4 border-b border-[#333] pb-4">
        <PageRoutingPanel
          page={draftPage}
          site={site}
          onChange={(patch) => setDraftPage((prev) => ({ ...prev, ...patch }))}
        />
      </div>
      {!selectedBlockId && selectedStep && (
        <div className="mb-4 space-y-3 text-sm">
          <div>
            <div className="mb-2 text-xs font-medium text-white">Шаг</div>
            <label className="mb-1 block text-[10px] text-[#888]">Заголовок</label>
            <input
              className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
              style={{ background: FIGMA.inputBg }}
              value={selectedStep.title ?? ""}
              onChange={(e) => updateStep(selectedStep.id, { title: e.target.value })}
            />
            <label className="mb-1 block text-[10px] text-[#888]">Тип</label>
            <select
              className="w-full rounded border-0 px-2 py-1 text-xs text-white"
              style={{ background: FIGMA.inputBg }}
              value={selectedStep.type}
              onChange={(e) => updateStep(selectedStep.id, { type: e.target.value })}
            >
              {Object.entries(STEP_TYPES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      {selectedCard && selectedStepId && selectedBlockId && (
        <p className="mb-4 rounded bg-[#2a2a2a] px-2 py-2 text-[10px] leading-snug text-[#888]">
          Свойства карточки редактируются в панели «Свойства» ниже (или справа). Здесь — только
          шаг и маршрутизация страницы.
        </p>
      )}
      {selectedCard && selectedStepId && !selectedBlockId && (
        <p className="mb-4 rounded border border-dashed border-[#444] px-2 py-2 text-[10px] text-[#888]">
          Кликните карточку на холсте или в «Слоях», чтобы редактировать заголовок и описание.
        </p>
      )}
      {selectedField && currentFlow && (
        <WizardFlowFieldEditor
          flow={currentFlow}
          selectedField={selectedField}
          onUpdateFlow={updateFlow}
        />
      )}
    </>
  );

  const canvasToolbar =
    isCardStep ? (
      <WizardCardToolbar
        selectedChildId={selectedChildId}
        selectedCard={selectedCard}
        currentCards={currentCards}
        onAddCard={addCard}
        onMoveCard={moveCard}
        onRemoveCard={removeCard}
      />
    ) : undefined;

  return (
    <WizardStudioContext.Provider
      value={{
        selectedCardId: selectedChildId,
        onSelectCard: selectBlockForCard,
      }}
    >
      <WizardUnifiedPageEditor
        page={draftPage}
        site={site}
        profileBundle={profileBundle}
        initialNav={nav}
        onPageChange={(patch) =>
          patchEditor((prev) => ({ ...prev, draftPage: { ...prev.draftPage, ...patch } }))
        }
        onBlocksChange={(nextPage) => {
          const persisted = persistNormalizedWizardPage(nextPage);
          patchEditor((prev) => ({
            ...prev,
            draftPage: persisted,
            nav: navWithCardsFromBlocks(prev.nav, persisted),
          }));
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        previewStepId={previewStep}
        onPreviewStepChange={setPreviewStep}
        layersExtra={layersExtra}
        hideNavPanel
        canvasToolbar={canvasToolbar}
        rightSidebarExtra={rightSidebarExtra}
      />
    </WizardStudioContext.Provider>
  );
}
