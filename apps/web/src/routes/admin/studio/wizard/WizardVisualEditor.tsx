import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageConfig, SiteConfig, BlockConfig, BlockGridLayout } from "@pumpstation/contracts";
import { defaultBlockLayout as blockDefaultLayout } from "@pumpstation/contracts";
import { WizardStepRenderer, wizardStepUsesFrames } from "@/engine/WizardStepRenderer";
import { WizardStudioContext } from "./WizardStudioContext";
import { patchWizardPageFrames, frameBlocksForStep, ensureStepFrame, syncWizardPageFrames, removeStepFrame, replaceStepFrame } from "./wizardFrameUtils";
import { PropertiesPanel } from "@/routes/admin/studio/properties/PropertiesPanel";
import { PageRoutingPanel } from "@/routes/admin/studio/properties/PageRoutingPanel";
import { getSchema } from "@/routes/admin/studio/properties/blockSchema";
import { setNested } from "@/routes/admin/studio/canvas/studioPropUtils";
import {
  clampLayout,
  canPlaceLayout,
  gridContentHeight,
  pageGridMetrics,
  reorderBlocksInLayers,
} from "@/lib/gridLayout";
import { StudioCanvas } from "@/routes/admin/studio/canvas/StudioCanvas";
import { applyStrelaAppearance, type StrelaAppearance } from "@/lib/strela/appearance";
import { STRELA_SIDEBAR_WIDTH } from "@/lib/strela/cardUi";
import { WizardFunnelLayoutPanel } from "./WizardFunnelLayoutPanel";
import { Palette } from "@/routes/admin/studio/palette/Palette";
import { LayersPanel } from "@/routes/admin/studio/palette/LayersPanel";
import { STUDIO_CANVAS_DROP_ZONE_ID } from "@/routes/admin/studio/canvas/studioCanvasContext";
import { createStudioBlock } from "@/routes/admin/studio/canvas/studioBlockFactory";
import {
  wizardNavFingerprint,
  wizardPageFramesFingerprint,
} from "@/routes/admin/studio/studioDraftUtils";
import { WizardLiveCanvas } from "./WizardLiveCanvas";
import { StudioProfileProvider } from "@/providers/StudioProfileProvider";
import type { ProfileBundle } from "@/api/config";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { StudioLeftSidebar } from "../figma/StudioLeftSidebar";
import { StudioRightSidebar } from "../figma/StudioRightSidebar";
import { FIGMA } from "../figma/figmaTokens";
import { UndoRedoButtons } from "../components/UndoRedoButtons";
import { ImageDropUpload } from "../components/ImageDropUpload";
import {
  type CardItem,
  type FlowConfig,
  type FlowField,
  type WizardNavState,
  type WizardStep,
  FIELD_TYPES,
  STEP_ICONS,
  STEP_TYPES,
  CARD_IMAGE_PRESETS,
  flowKeyFromRef,
} from "./wizardTypes";

function SortableRow({
  id,
  label,
  icon,
  isSelected,
  onSelect,
  onDelete,
}: {
  id: string;
  label: string;
  icon?: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isSelected ? FIGMA.accentSoft : undefined,
    color: isSelected ? FIGMA.accent : FIGMA.textMuted,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className="group flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-[11px]"
    >
      <span
        ref={setActivatorNodeRef}
        className="cursor-grab text-[10px] text-[#555] active:cursor-grabbing"
        title="Перетащить"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>
      {icon && <span>{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {onDelete && (
        <button
          type="button"
          title="Удалить"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded px-1 text-[10px] text-red-400 opacity-60 hover:bg-red-900/30 hover:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function DraggablePaletteItem({
  id,
  label,
  icon,
  data,
  onClick,
}: {
  id: string;
  label: string;
  icon: string;
  data: Record<string, unknown>;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex w-full items-center gap-1 rounded px-1 py-1 text-left text-xs hover:bg-[#383838]"
    >
      <span
        className="cursor-grab px-1 text-[10px] text-[#555] active:cursor-grabbing"
        title="Перетащить"
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left"
      >
        <span>{icon}</span>
        <span style={{ color: FIGMA.textMuted }}>{label}</span>
      </button>
    </div>
  );
}

export function WizardVisualEditor({
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
}: {
  page: PageConfig;
  site: SiteConfig;
  profileBundle: ProfileBundle;
  initialNav: WizardNavState;
  onSave: (
    nav: WizardNavState,
    pageDraft?: PageConfig,
    appearance?: StrelaAppearance,
  ) => Promise<void> | void;
  onDirtyChange?: (dirty: { nav: boolean; frames: boolean; appearance: boolean }) => void;
  onRegisterSave?: (fn: () => Promise<void>) => void;
  onDraftPageChange?: (page: PageConfig) => void;
  onNavDraftChange?: (nav: WizardNavState) => void;
  onPreviewStepChange?: (stepId: string) => void;
  onAppearanceDraftChange?: (appearance: StrelaAppearance) => void;
}) {
  const { state: nav, setState: setNav, undo, redo, canUndo, canRedo, reset } = useUndoRedo(initialNav);
  const serverNavKeyRef = useRef<string>("");
  const [draftPage, setDraftPage] = useState(page);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(initialNav.steps[0]?.id ?? null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedFrameBlockId, setSelectedFrameBlockId] = useState<string | null>(null);
  const [previewStep, setPreviewStep] = useState(initialNav.steps[0]?.id ?? "product-class");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showStrelaChrome, setShowStrelaChrome] = useState(true);
  const initialAppearance = (profileBundle.branding.appearance ?? {}) as StrelaAppearance;
  const [appearanceDraft, setAppearanceDraft] = useState<StrelaAppearance>(initialAppearance);
  const gridMetrics = pageGridMetrics(page);
  const isStrelaFunnel =
    (profileBundle.branding as { layoutVariant?: string }).layoutVariant === "strela-funnel";

  useEffect(() => {
    setAppearanceDraft((profileBundle.branding.appearance ?? {}) as StrelaAppearance);
  }, [profileBundle.branding.appearance]);

  useEffect(() => {
    if (isStrelaFunnel) applyStrelaAppearance(appearanceDraft);
  }, [appearanceDraft, isStrelaFunnel]);

  useEffect(() => {
    setDraftPage(page);
  }, [page]);

  useEffect(() => {
    setDraftPage((prev) => {
      const synced = syncWizardPageFrames(prev, nav.steps, isStrelaFunnel);
      return wizardPageFramesFingerprint(synced) === wizardPageFramesFingerprint(prev)
        ? prev
        : synced;
    });
  }, [nav.steps, isStrelaFunnel]);

  useEffect(() => {
    onDraftPageChange?.(draftPage);
  }, [draftPage, onDraftPageChange]);

  useEffect(() => {
    onNavDraftChange?.(nav);
  }, [nav, onNavDraftChange]);

  useEffect(() => {
    onPreviewStepChange?.(previewStep);
  }, [previewStep, onPreviewStepChange]);

  useEffect(() => {
    onAppearanceDraftChange?.(appearanceDraft);
  }, [appearanceDraft, onAppearanceDraftChange]);

  useEffect(() => {
    const key = JSON.stringify(initialNav);
    if (key === serverNavKeyRef.current) return;
    serverNavKeyRef.current = key;
    reset(initialNav);
    const first = initialNav.steps[0]?.id ?? null;
    setSelectedStepId(first);
    setPreviewStep(first ?? "product-class");
    setSelectedChildId(null);
  }, [initialNav, reset]);

  const selectedStep = nav.steps.find((s) => s.id === selectedStepId);
  const previewStepDef = nav.steps.find((s) => s.id === previewStep);
  const isCardStep = selectedStep?.type === "card-grid";
  const isFormStep = selectedStep?.type === "selection-form";
  const previewUsesFrames = wizardStepUsesFrames(
    draftPage,
    previewStep,
    previewStepDef,
    isStrelaFunnel,
  );

  const frameBlocksForPreview = useMemo(() => {
    return frameBlocksForStep(draftPage, previewStep, previewStepDef, isStrelaFunnel);
  }, [draftPage, previewStep, previewStepDef, isStrelaFunnel]);

  const selectedFrameBlock =
    frameBlocksForPreview.find((b) => b.id === selectedFrameBlockId) ?? null;

  const patchFrameBlocks = useCallback(
    (stepId: string, updater: BlockConfig[] | ((prev: BlockConfig[]) => BlockConfig[])) => {
      setDraftPage((prev) => {
        const step = nav.steps.find((s) => s.id === stepId);
        const current = frameBlocksForStep(prev, stepId, step, isStrelaFunnel);
        const next = typeof updater === "function" ? updater(current) : updater;
        return patchWizardPageFrames(prev, stepId, next);
      });
    },
    [nav.steps, isStrelaFunnel],
  );

  const addFrameBlock = useCallback(
    (type: string) => {
      const extraProps =
        type.startsWith("wizard/") && type !== "wizard/legacy-selection"
          ? { stepId: previewStep }
          : undefined;
      const block = createStudioBlock(type, {
        cols: gridMetrics.cols,
        existing: frameBlocksForPreview,
        extraProps,
      });
      patchFrameBlocks(previewStep, (prev) => [...prev, block]);
      setSelectedFrameBlockId(block.id);
      setSelectedChildId(null);
    },
    [previewStep, gridMetrics.cols, frameBlocksForPreview, patchFrameBlocks],
  );

  const removeFrameBlock = useCallback(
    (id: string) => {
      patchFrameBlocks(previewStep, (prev) => prev.filter((b) => b.id !== id));
      if (selectedFrameBlockId === id) setSelectedFrameBlockId(null);
    },
    [previewStep, patchFrameBlocks, selectedFrameBlockId],
  );

  const reorderFrameBlock = useCallback(
    (from: number, to: number) => {
      patchFrameBlocks(previewStep, (prev) => reorderBlocksInLayers(prev, from, to, "page", gridMetrics.cols));
    },
    [previewStep, patchFrameBlocks, gridMetrics.cols],
  );

  const currentCards = selectedStepId ? (nav.cards[selectedStepId] ?? []) : [];
  const flowKey = flowKeyFromRef(selectedStep?.flowRef);
  const currentFlow: FlowConfig | null =
    flowKey && nav.flows ? (nav.flows[flowKey] ?? null) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const childSortIds = useMemo(() => {
    if (isCardStep) return currentCards.map((c) => `card:${c.id}`);
    if (isFormStep && currentFlow) {
      return currentFlow.sections.flatMap((s) => s.fields.map((f) => `field:${s.id}:${f.id}`));
    }
    return [];
  }, [isCardStep, isFormStep, currentCards, currentFlow]);

  const reorderSteps = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      setNav((prev) => {
        const steps = [...prev.steps];
        const [item] = steps.splice(from, 1);
        steps.splice(to, 0, item);
        return { ...prev, steps };
      });
    },
    [setNav],
  );

  const addStep = useCallback(
    (type: string) => {
      const id = `step-${Date.now()}`;
      const step: WizardStep = {
        id,
        type,
        title: type === "card-grid" ? "Новый выбор" : "Форма подбора",
      };
      setNav((prev) => ({
        ...prev,
        steps: [...prev.steps, step],
        cards: type === "card-grid" ? { ...prev.cards, [id]: [] } : prev.cards,
      }));
      setDraftPage((prev) => ensureStepFrame(prev, step, isStrelaFunnel));
      setSelectedStepId(id);
      setPreviewStep(id);
    },
    [setNav, isStrelaFunnel],
  );

  const removeStep = useCallback(
    (id: string) => {
      setNav((prev) => {
        const { [id]: _removed, ...restCards } = prev.cards;
        return {
          ...prev,
          steps: prev.steps.filter((s) => s.id !== id),
          cards: restCards,
        };
      });
      setDraftPage((prev) => removeStepFrame(prev, id));
      if (selectedStepId === id) setSelectedStepId(null);
    },
    [setNav, selectedStepId],
  );

  const updateStep = useCallback(
    (id: string, patch: Partial<WizardStep>) => {
      setNav((prev) => {
        const nextSteps = prev.steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
        if (patch.type) {
          const updated = nextSteps.find((s) => s.id === id);
          if (updated) {
            setDraftPage((p) => replaceStepFrame(p, updated, isStrelaFunnel));
          }
        }
        return { ...prev, steps: nextSteps };
      });
    },
    [setNav, isStrelaFunnel],
  );

  const updateCards = useCallback(
    (stepId: string, items: CardItem[]) => {
      setNav((prev) => ({ ...prev, cards: { ...prev.cards, [stepId]: items } }));
    },
    [setNav],
  );

  const updateCard = useCallback(
    (stepId: string, cardId: string, patch: Partial<CardItem>) => {
      setNav((prev) => ({
        ...prev,
        cards: {
          ...prev.cards,
          [stepId]: (prev.cards[stepId] ?? []).map((c) =>
            c.id === cardId ? { ...c, ...patch } : c,
          ),
        },
      }));
    },
    [setNav],
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

  const addCard = useCallback(() => {
    if (!selectedStepId) return;
    const card: CardItem = {
      id: `card-${Date.now()}`,
      title: "Новая карточка",
      description: "",
      enabled: true,
    };
    updateCards(selectedStepId, [...currentCards, card]);
    setSelectedChildId(card.id);
  }, [selectedStepId, currentCards, updateCards]);

  const removeCard = useCallback(
    (cardId: string) => {
      if (!selectedStepId) return;
      updateCards(
        selectedStepId,
        currentCards.filter((c) => c.id !== cardId),
      );
      if (selectedChildId === cardId) setSelectedChildId(null);
    },
    [selectedStepId, currentCards, updateCards, selectedChildId],
  );

  const moveCard = useCallback(
    (cardId: string, direction: -1 | 1) => {
      if (!selectedStepId) return;
      const index = currentCards.findIndex((c) => c.id === cardId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= currentCards.length) return;
      const next = [...currentCards];
      [next[index], next[target]] = [next[target], next[index]];
      updateCards(selectedStepId, next);
    },
    [selectedStepId, currentCards, updateCards],
  );

  const addField = useCallback(
    (type = "text") => {
      if (!currentFlow || !selectedStepId) return;
      const sectionIndex = currentFlow.sections.length - 1;
      const section = currentFlow.sections[sectionIndex] ?? {
        id: `section-${Date.now()}`,
        title: "Параметры",
        fields: [],
      };
      const field: FlowField = {
        id: `field-${Date.now()}`,
        type,
        label: "Новое поле",
      };
      const sections = [...currentFlow.sections];
      if (sectionIndex < 0) {
        sections.push({ ...section, fields: [field] });
      } else {
        sections[sectionIndex] = {
          ...sections[sectionIndex],
          fields: [...sections[sectionIndex].fields, field],
        };
      }
      updateFlow({ ...currentFlow, sections });
      setSelectedChildId(field.id);
    },
    [currentFlow, selectedStepId, updateFlow],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("palette-step-")) {
      const type = activeId.replace("palette-step-", "");
      if (overId === STUDIO_CANVAS_DROP_ZONE_ID || overId.startsWith("step:")) {
        addStep(type);
      }
      return;
    }

    if (activeId.startsWith("palette-field-")) {
      const type = activeId.replace("palette-field-", "");
      if (overId === STUDIO_CANVAS_DROP_ZONE_ID || overId.startsWith("field:")) {
        addField(type);
      }
      return;
    }

    if (activeId === "palette-card") {
      if (overId === STUDIO_CANVAS_DROP_ZONE_ID || overId.startsWith("card:")) {
        addCard();
      }
      return;
    }

    if (activeId.startsWith("step:") && overId.startsWith("step:")) {
      const from = nav.steps.findIndex((s) => `step:${s.id}` === activeId);
      const to = nav.steps.findIndex((s) => `step:${s.id}` === overId);
      if (from >= 0 && to >= 0) reorderSteps(from, to);
      return;
    }

    if (activeId.startsWith("card:") && overId.startsWith("card:") && selectedStepId) {
      const fromId = activeId.replace("card:", "");
      const toId = overId.replace("card:", "");
      const from = currentCards.findIndex((c) => c.id === fromId);
      const to = currentCards.findIndex((c) => c.id === toId);
      if (from >= 0 && to >= 0 && from !== to) {
        const next = [...currentCards];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        updateCards(selectedStepId, next);
      }
      return;
    }

    if (
      activeId.startsWith("palette-") &&
      !activeId.startsWith("palette-step-") &&
      !activeId.startsWith("palette-field-") &&
      activeId !== "palette-card"
    ) {
      const type = (active.data.current as { blockType?: string })?.blockType;
      if (!type) return;
      if (overId === STUDIO_CANVAS_DROP_ZONE_ID) {
        addFrameBlock(type);
        return;
      }
      const overIndex = frameBlocksForPreview.findIndex((b) => b.id === overId);
      if (overIndex >= 0) {
        const block = createStudioBlock(type, {
          cols: gridMetrics.cols,
          existing: frameBlocksForPreview,
          extraProps:
            type.startsWith("wizard/") && type !== "wizard/legacy-selection"
              ? { stepId: previewStep }
              : undefined,
        });
        patchFrameBlocks(previewStep, (prev) => {
          const next = [...prev];
          next.splice(overIndex, 0, block);
          return next;
        });
        setSelectedFrameBlockId(block.id);
        setSelectedChildId(null);
      }
      return;
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        setSelectedChildId(null);
        setSelectedFrameBlockId(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedFrameBlockId) {
        e.preventDefault();
        removeFrameBlock(selectedFrameBlockId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, selectedFrameBlockId, removeFrameBlock]);

  const appearanceDirty =
    JSON.stringify(appearanceDraft) !== JSON.stringify(initialAppearance);

  const artboardMinHeight = useMemo(
    () =>
      previewUsesFrames
        ? Math.max(700, gridContentHeight(frameBlocksForPreview, gridMetrics.rowHeight))
        : 700,
    [previewUsesFrames, frameBlocksForPreview, gridMetrics.rowHeight],
  );

  const draftBundle = useMemo(
    (): ProfileBundle => ({
      ...profileBundle,
      branding: {
        ...profileBundle.branding,
        appearance: appearanceDraft,
      },
      wizard: {
        navigation: { steps: nav.steps, cards: nav.cards },
        flows: nav.flows ?? {},
      },
    }),
    [profileBundle, nav, appearanceDraft],
  );

  const selectedCard = currentCards.find((c) => c.id === selectedChildId);
  const selectedField =
    currentFlow &&
    currentFlow.sections
      .flatMap((s) => s.fields.map((f) => ({ section: s, field: f })))
      .find(({ field }) => field.id === selectedChildId);

  const handleSaveClick = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(nav, draftPage, appearanceDirty ? appearanceDraft : undefined);
    } finally {
      setSaving(false);
    }
  }, [onSave, nav, draftPage, appearanceDirty, appearanceDraft]);

  useEffect(() => {
    onRegisterSave?.(handleSaveClick);
  }, [onRegisterSave, handleSaveClick]);

  useEffect(() => {
    onDirtyChange?.({
      nav: wizardNavFingerprint(nav) !== wizardNavFingerprint(initialNav),
      frames:
        wizardPageFramesFingerprint(draftPage) !== wizardPageFramesFingerprint(page) ||
        draftPage.route !== page.route ||
        draftPage.title !== page.title ||
        draftPage.inMenu !== page.inMenu,
      appearance: appearanceDirty,
    });
  }, [nav, draftPage, initialNav, page, appearanceDirty, onDirtyChange]);

  const updateFrameBlockProp = (id: string, key: string, value: unknown) => {
    patchFrameBlocks(previewStep, (prev) =>
      prev.map((b) =>
        b.id !== id ? b : { ...b, props: setNested(b.props ?? {}, key, value) },
      ),
    );
  };

  const updateFrameBlockLayout = (id: string, layout: BlockGridLayout) => {
    const next = clampLayout(layout, gridMetrics.cols);
    patchFrameBlocks(previewStep, (prev) => {
      if (!canPlaceLayout(next, prev, id, gridMetrics.cols)) return prev;
      return prev.map((b) => (b.id === id ? { ...b, layout: next } : b));
    });
  };

  const updateFrameBlockType = (id: string, type: string) => {
    patchFrameBlocks(previewStep, (prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const base = blockDefaultLayout(type, 0);
        const props: Record<string, unknown> = {};
        const schema = getSchema(type);
        if (schema) {
          for (const field of schema.fields) {
            if (field.defaultValue !== undefined) {
              Object.assign(props, setNested(props, field.key, field.defaultValue));
            }
          }
        }
        if (type.startsWith("wizard/") && type !== "wizard/legacy-selection") {
          props.stepId = previewStep;
        }
        return { ...b, type, props, layout: b.layout ?? base };
      }),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <StudioLeftSidebar
          layers={
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase text-[#666]">Шаги</span>
                <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
              </div>
              <SortableContext
                items={nav.steps.map((s) => `step:${s.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  {nav.steps.map((step) => (
                    <SortableRow
                      key={step.id}
                      id={`step:${step.id}`}
                      icon={STEP_ICONS[step.type] ?? "🔹"}
                      label={step.title ?? step.titleKey ?? step.id}
                      isSelected={selectedStepId === step.id}
                      onSelect={() => {
                        setSelectedStepId(step.id);
                        setPreviewStep(step.id);
                        setSelectedChildId(null);
                        setSelectedFrameBlockId(null);
                      }}
                      onDelete={() => removeStep(step.id)}
                    />
                  ))}
                </div>
              </SortableContext>

              {isCardStep && (
                <>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-semibold uppercase text-[#666]">Карточки</span>
                    <button
                      type="button"
                      onClick={addCard}
                      className="rounded px-1.5 py-0.5 text-[10px] text-[#0d99ff] hover:bg-[#0d99ff]/10"
                    >
                      + Добавить
                    </button>
                  </div>
                  <SortableContext items={childSortIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {currentCards.map((card) => (
                        <SortableRow
                          key={card.id}
                          id={`card:${card.id}`}
                          label={card.title}
                          icon="🃏"
                          isSelected={selectedChildId === card.id}
                          onSelect={() => setSelectedChildId(card.id)}
                          onDelete={() => removeCard(card.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </>
              )}

              {isFormStep && currentFlow && (
                <>
                  <span className="block px-1 text-[10px] font-semibold uppercase text-[#666]">
                    Поля
                  </span>
                  <SortableContext items={childSortIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {currentFlow.sections.flatMap((section) =>
                        section.fields.map((field) => (
                          <SortableRow
                            key={`${section.id}-${field.id}`}
                            id={`field:${section.id}:${field.id}`}
                            label={field.label}
                            icon="▪"
                            isSelected={selectedChildId === field.id}
                            onSelect={() => setSelectedChildId(field.id)}
                            onDelete={() => {
                              const sections = currentFlow.sections.map((s) =>
                                s.id === section.id
                                  ? { ...s, fields: s.fields.filter((f) => f.id !== field.id) }
                                  : s,
                              );
                              updateFlow({ ...currentFlow, sections });
                            }}
                          />
                        )),
                      )}
                    </div>
                  </SortableContext>
                </>
              )}

              {previewUsesFrames && frameBlocksForPreview.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-1 pt-2">
                    <span className="text-[10px] font-semibold uppercase text-[#666]">Блоки шага</span>
                  </div>
                  <LayersPanel
                    blocks={frameBlocksForPreview}
                    selectedId={selectedFrameBlockId}
                    onSelect={(id) => {
                      setSelectedFrameBlockId(id);
                      setSelectedChildId(null);
                    }}
                    onReorder={reorderFrameBlock}
                    onDelete={removeFrameBlock}
                  />
                </>
              )}
            </div>
          }
          assets={
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="block px-1 text-[10px] font-semibold uppercase text-[#666]">
                  Структура визарда
                </span>
              <DraggablePaletteItem
                id="palette-step-card-grid"
                icon="📋"
                label="Шаг: карточки"
                data={{ kind: "step", type: "card-grid" }}
                onClick={() => addStep("card-grid")}
              />
              <DraggablePaletteItem
                id="palette-step-selection-form"
                icon="📝"
                label="Шаг: форма"
                data={{ kind: "step", type: "selection-form" }}
                onClick={() => addStep("selection-form")}
              />
              {isCardStep && (
                <DraggablePaletteItem
                  id="palette-card"
                  icon="🃏"
                  label="Карточка"
                  data={{ kind: "card" }}
                  onClick={addCard}
                />
              )}
              {isFormStep &&
                FIELD_TYPES.map((t) => (
                  <DraggablePaletteItem
                    key={t}
                    id={`palette-field-${t}`}
                    icon="▪"
                    label={`Поле: ${t}`}
                    data={{ kind: "field", type: t }}
                    onClick={() => addField(t)}
                  />
                ))}
              </div>
              <div className="border-t border-[#333] pt-3">
                <span className="mb-2 block px-1 text-[10px] font-semibold uppercase text-[#666]">
                  Блоки на шаге
                </span>
                <Palette categoryFilter="wizard" onAddBlock={addFrameBlock} />
              </div>
            </div>
          }
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {isCardStep && (
            <div
              className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2"
              style={{ borderColor: FIGMA.panelBorder, background: FIGMA.panel }}
            >
              <button
                type="button"
                onClick={addCard}
                className="rounded px-2.5 py-1 text-[11px] text-white"
                style={{ background: FIGMA.accent }}
              >
                + Карточка
              </button>
              {selectedChildId && selectedCard && (
                <>
                  <button
                    type="button"
                    title="Выше"
                    disabled={currentCards.findIndex((c) => c.id === selectedChildId) <= 0}
                    onClick={() => moveCard(selectedChildId, -1)}
                    className="rounded px-2 py-1 text-[11px] text-[#ccc] hover:bg-[#383838] disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    title="Ниже"
                    disabled={
                      currentCards.findIndex((c) => c.id === selectedChildId) >=
                      currentCards.length - 1
                    }
                    onClick={() => moveCard(selectedChildId, 1)}
                    className="rounded px-2 py-1 text-[11px] text-[#ccc] hover:bg-[#383838] disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCard(selectedChildId)}
                    className="rounded px-2 py-1 text-[11px] text-red-400 hover:bg-red-900/30"
                  >
                    Удалить
                  </button>
                </>
              )}
              <span className="text-[10px] text-[#777]">
                {selectedCard
                  ? `Редактируется: ${selectedCard.title}`
                  : "Кликните карточку на превью или в списке «Слои»"}
              </span>
            </div>
          )}

          {isStrelaFunnel && (
            <div
              className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5 text-[11px]"
              style={{ borderColor: FIGMA.panelBorder, background: FIGMA.panel }}
            >
              <span className="text-[#888]">
                {showStrelaChrome
                  ? "Как на сайте и в «Превью» — оболочка Strela + карточки"
                  : "Режим сетки: drag/resize блоков; для WYSIWYG — «Оболочка Strela»"}
              </span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setShowStrelaChrome(false)}
                  className="rounded px-2 py-0.5"
                  style={{
                    background: !showStrelaChrome ? FIGMA.accent : "#383838",
                    color: !showStrelaChrome ? "#fff" : "#aaa",
                  }}
                >
                  Сетка
                </button>
                <button
                  type="button"
                  onClick={() => setShowStrelaChrome(true)}
                  className="rounded px-2 py-0.5"
                  style={{
                    background: showStrelaChrome ? FIGMA.accent : "#383838",
                    color: showStrelaChrome ? "#fff" : "#aaa",
                  }}
                >
                  Оболочка Strela
                </button>
              </div>
            </div>
          )}

          {isStrelaFunnel && showStrelaChrome ? (
            <div className="relative min-h-0 flex-1 overflow-auto" style={{ background: FIGMA.appBg }}>
              <WizardLiveCanvas
                page={draftPage}
                site={site}
                bundle={draftBundle}
                previewStepId={previewStep}
                selectedCardId={selectedChildId}
                onSelectCard={setSelectedChildId}
              />
            </div>
          ) : (
          <StudioCanvas
            artboardLabel={`${page.title} — ${selectedStep?.title ?? previewStep}`}
            artboardWidth={gridMetrics.artboardWidth}
            artboardMinHeight={artboardMinHeight}
            onSelect={(id) => {
              setSelectedFrameBlockId(id);
              if (id) setSelectedChildId(null);
            }}
            onDropBlock={previewUsesFrames ? addFrameBlock : undefined}
          >
            <div className="relative h-full min-h-[500px] w-full">
              {isStrelaFunnel && (
                <div
                  className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 border-r border-dashed border-sky-400/50 bg-sky-500/[0.06]"
                  style={{ width: `var(--funnel-sidebar-width, ${STRELA_SIDEBAR_WIDTH})` }}
                  title="Зона сайдбара Strela"
                />
              )}
              <StudioProfileProvider bundle={draftBundle}>
                <WizardStudioContext.Provider
                  value={{
                    selectedCardId: selectedChildId,
                    onSelectCard: (cardId) => {
                      setSelectedChildId(cardId);
                      setSelectedFrameBlockId(null);
                    },
                  }}
                >
                  <WizardStepRenderer
                    page={draftPage}
                    stepId={previewStep}
                    stepDef={previewStepDef}
                    strela={isStrelaFunnel}
                    site={site}
                    editor={{
                      selectedId: selectedFrameBlockId,
                      onSelect: (id) => {
                        setSelectedFrameBlockId(id);
                        if (id) setSelectedChildId(null);
                      },
                      onFrameBlocksChange: (updater) => patchFrameBlocks(previewStep, updater),
                      profileId: profileBundle.profile.id,
                    }}
                    selectedCardId={selectedChildId}
                    onSelectCard={setSelectedChildId}
                  />
                </WizardStudioContext.Provider>
              </StudioProfileProvider>
            </div>
          </StudioCanvas>
          )}
        </div>

        <StudioRightSidebar>
          {isStrelaFunnel && (
            <WizardFunnelLayoutPanel
              profileId={profileBundle.profile.id}
              appearance={appearanceDraft}
              onChange={(patch) => setAppearanceDraft((prev) => ({ ...prev, ...patch }))}
            />
          )}
          <div className="mb-4 border-b border-[#333] pb-4">
            <PageRoutingPanel
              page={draftPage}
              site={site}
              onChange={(patch) => setDraftPage((prev) => ({ ...prev, ...patch }))}
            />
          </div>
          {selectedFrameBlock ? (
            <PropertiesPanel
              block={selectedFrameBlock}
              gridCols={gridMetrics.cols}
              onChangeType={(type) => updateFrameBlockType(selectedFrameBlock.id, type)}
              onChangeProp={(key, value) => updateFrameBlockProp(selectedFrameBlock.id, key, value)}
              onChangeLayout={(layout) => updateFrameBlockLayout(selectedFrameBlock.id, layout)}
            />
          ) : !selectedStep ? (
            <p className="text-[11px] text-[#666]">Выберите шаг слева или перетащите тип шага на canvas</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <div className="mb-2 text-xs font-medium text-white">Шаг</div>
                <label className="mb-1 block text-[10px] text-[#888]">Заголовок</label>
                {selectedStep.titleKey && !selectedStep.title ? (
                  <p className="mb-2 text-[10px] text-[#888]">
                    Из брендинга: <code className="text-[#0d99ff]">{selectedStep.titleKey}</code>
                    {selectedStep.subtitleKey ? (
                      <>
                        {" "}
                        / <code className="text-[#0d99ff]">{selectedStep.subtitleKey}</code>
                      </>
                    ) : null}
                  </p>
                ) : null}
                <input
                  className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
                  style={{ background: FIGMA.inputBg }}
                  value={selectedStep.title ?? ""}
                  onChange={(e) => updateStep(selectedStep.id, { title: e.target.value })}
                />
                <label className="mb-1 block text-[10px] text-[#888]">Подзаголовок</label>
                <input
                  className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
                  style={{ background: FIGMA.inputBg }}
                  value={selectedStep.subtitle ?? ""}
                  placeholder={selectedStep.subtitleKey ? `из брендинга: ${selectedStep.subtitleKey}` : ""}
                  onChange={(e) => updateStep(selectedStep.id, { subtitle: e.target.value || undefined })}
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

              {isCardStep && !selectedCard && (
                <p className="rounded bg-[#2a2a2a] p-2 text-[10px] leading-relaxed text-[#888]">
                  Выберите шаг с карточками, затем кликните карточку на превью или в списке «Слои».
                  Добавить — кнопка «+ Карточка» над превью или «+ Добавить» в слоях.
                </p>
              )}

              {selectedCard && selectedStepId && (
                <div className="space-y-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-white">Карточка</span>
                    <button
                      type="button"
                      onClick={() => removeCard(selectedCard.id)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Удалить
                    </button>
                  </div>
                  <label className="mb-1 block text-[10px] text-[#888]">ID</label>
                  <input
                    className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-[#888]"
                    style={{ background: FIGMA.inputBg }}
                    value={selectedCard.id}
                    readOnly
                  />
                  <label className="mb-1 block text-[10px] text-[#888]">Заголовок</label>
                  <input
                    className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
                    style={{ background: FIGMA.inputBg }}
                    value={selectedCard.title}
                    onChange={(e) => updateCard(selectedStepId, selectedCard.id, { title: e.target.value })}
                  />
                  <label className="mb-1 block text-[10px] text-[#888]">Изображение</label>
                  <select
                    className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
                    style={{ background: FIGMA.inputBg }}
                    value={
                      CARD_IMAGE_PRESETS.some((p) => p.url === selectedCard.image)
                        ? selectedCard.image
                        : ""
                    }
                    onChange={(e) =>
                      updateCard(selectedStepId, selectedCard.id, {
                        image: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">— из галереи —</option>
                    {CARD_IMAGE_PRESETS.map((preset) => (
                      <option key={preset.url} value={preset.url}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <ImageDropUpload
                    profileId={profileBundle.profile.id}
                    value={selectedCard.image}
                    onChange={(url) =>
                      updateCard(selectedStepId, selectedCard.id, { image: url || undefined })
                    }
                  />
                  <label className="mb-1 block text-[10px] text-[#888]">URL или путь</label>
                  <input
                    className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
                    style={{ background: FIGMA.inputBg }}
                    placeholder="/selection-assets/... или URL"
                    value={selectedCard.image ?? ""}
                    onChange={(e) =>
                      updateCard(selectedStepId, selectedCard.id, { image: e.target.value || undefined })
                    }
                  />
                  <label className="mb-1 block text-[10px] text-[#888]">Описание</label>
                  <textarea
                    className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
                    style={{ background: FIGMA.inputBg }}
                    rows={4}
                    value={selectedCard.description ?? ""}
                    onChange={(e) =>
                      updateCard(selectedStepId, selectedCard.id, { description: e.target.value })
                    }
                  />
                  <label className="mb-1 flex items-center gap-2 text-[10px] text-[#888]">
                    <input
                      type="checkbox"
                      checked={selectedCard.enabled !== false}
                      onChange={(e) =>
                        updateCard(selectedStepId, selectedCard.id, { enabled: e.target.checked })
                      }
                    />
                    Активна (кликабельна)
                  </label>
                  <label className="mb-1 block text-[10px] text-[#888]">Следующий шаг</label>
                  <select
                    className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
                    style={{ background: FIGMA.inputBg }}
                    value={selectedCard.next ?? ""}
                    onChange={(e) =>
                      updateCard(selectedStepId, selectedCard.id, {
                        next: e.target.value || undefined,
                      })
                    }
                  >
                    <option value="">— не задан —</option>
                    {nav.steps.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title ?? s.titleKey ?? s.id}
                      </option>
                    ))}
                  </select>
                  <label className="mb-1 block text-[10px] text-[#888]">Flow (алгоритм)</label>
                  <input
                    className="w-full rounded border-0 px-2 py-1 text-xs text-white"
                    style={{ background: FIGMA.inputBg }}
                    placeholder="bps-w-domestic"
                    value={selectedCard.flow ?? ""}
                    onChange={(e) =>
                      updateCard(selectedStepId, selectedCard.id, {
                        flow: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              )}

              {selectedField && currentFlow && (
                <div>
                  <div className="mb-2 text-xs font-medium text-white">Поле</div>
                  <input
                    className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
                    style={{ background: FIGMA.inputBg }}
                    value={selectedField.field.label}
                    onChange={(e) => {
                      const sections = currentFlow.sections.map((s) =>
                        s.id === selectedField.section.id
                          ? {
                              ...s,
                              fields: s.fields.map((f) =>
                                f.id === selectedField.field.id
                                  ? { ...f, label: e.target.value }
                                  : f,
                              ),
                            }
                          : s,
                      );
                      updateFlow({ ...currentFlow, sections });
                    }}
                  />
                  <select
                    className="w-full rounded border-0 px-2 py-1 text-xs text-white"
                    style={{ background: FIGMA.inputBg }}
                    value={selectedField.field.type}
                    onChange={(e) => {
                      const sections = currentFlow.sections.map((s) =>
                        s.id === selectedField.section.id
                          ? {
                              ...s,
                              fields: s.fields.map((f) =>
                                f.id === selectedField.field.id
                                  ? { ...f, type: e.target.value }
                                  : f,
                              ),
                            }
                          : s,
                      );
                      updateFlow({ ...currentFlow, sections });
                    }}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            </div>
          )}
        </StudioRightSidebar>
      </div>

      <DragOverlay>
        {activeDragId && (
          <div className="rounded bg-[#333] px-3 py-2 text-xs text-white shadow-lg">
            {activeDragId.replace("palette-", "")}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
