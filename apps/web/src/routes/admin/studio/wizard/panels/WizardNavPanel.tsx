import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FIGMA } from "@/routes/admin/studio/figma/figmaTokens";
import { UndoRedoButtons } from "@/routes/admin/studio/components/UndoRedoButtons";
import type { WizardNavState, WizardStep } from "../wizardTypes";
import { STEP_ICONS } from "../wizardTypes";

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

export function WizardNavPanel({
  nav,
  selectedStepId,
  onSelectStep,
  onRemoveStep,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  compactStepSwitcher,
}: {
  nav: WizardNavState;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onRemoveStep: (stepId: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Toolbar dropdown instead of full list */
  compactStepSwitcher?: boolean;
}) {
  if (compactStepSwitcher) {
    return (
      <select
        className="max-w-[220px] rounded border-0 px-2 py-1 text-[11px] text-white"
        style={{ background: FIGMA.inputBg }}
        value={selectedStepId ?? ""}
        onChange={(e) => onSelectStep(e.target.value)}
      >
        {nav.steps.map((step) => (
          <option key={step.id} value={step.id}>
            {step.title ?? step.titleKey ?? step.id}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase text-[#666]">Шаги</span>
        <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
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
              onSelect={() => onSelectStep(step.id)}
              onDelete={() => onRemoveStep(step.id)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function wizardStepLabel(step: WizardStep): string {
  return step.title ?? step.titleKey ?? step.id;
}
