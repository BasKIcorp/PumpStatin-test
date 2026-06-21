import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FIGMA } from "@/routes/admin/studio/figma/figmaTokens";
import type { FlowConfig } from "../wizardTypes";
import { FIELD_TYPES } from "../wizardTypes";

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

export function WizardFlowPanel({
  flow,
  childSortIds,
  selectedChildId,
  onSelectField,
  onRemoveField,
}: {
  flow: FlowConfig;
  childSortIds: string[];
  selectedChildId: string | null;
  onSelectField: (fieldId: string) => void;
  onRemoveField: (sectionId: string, fieldId: string) => void;
}) {
  return (
    <>
      <span className="block px-1 text-[10px] font-semibold uppercase text-[#666]">Поля</span>
      <SortableContext items={childSortIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {flow.sections.flatMap((section) =>
            section.fields.map((field) => (
              <SortableRow
                key={`${section.id}-${field.id}`}
                id={`field:${section.id}:${field.id}`}
                label={field.label}
                icon="▪"
                isSelected={selectedChildId === field.id}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onRemoveField(section.id, field.id)}
              />
            )),
          )}
        </div>
      </SortableContext>
    </>
  );
}

export function WizardFlowFieldEditor({
  flow,
  selectedField,
  onUpdateFlow,
}: {
  flow: FlowConfig;
  selectedField: {
    section: FlowConfig["sections"][number];
    field: FlowConfig["sections"][number]["fields"][number];
  } | null | undefined;
  onUpdateFlow: (flow: FlowConfig) => void;
}) {
  if (!selectedField) return null;

  return (
    <div>
      <div className="mb-2 text-xs font-medium text-white">Поле</div>
      <input
        className="mb-2 w-full rounded border-0 px-2 py-1 text-xs text-white"
        style={{ background: FIGMA.inputBg }}
        value={selectedField.field.label}
        onChange={(e) => {
          const sections = flow.sections.map((s) =>
            s.id === selectedField.section.id
              ? {
                  ...s,
                  fields: s.fields.map((f) =>
                    f.id === selectedField.field.id ? { ...f, label: e.target.value } : f,
                  ),
                }
              : s,
          );
          onUpdateFlow({ ...flow, sections });
        }}
      />
      <select
        className="w-full rounded border-0 px-2 py-1 text-xs text-white"
        style={{ background: FIGMA.inputBg }}
        value={selectedField.field.type}
        onChange={(e) => {
          const sections = flow.sections.map((s) =>
            s.id === selectedField.section.id
              ? {
                  ...s,
                  fields: s.fields.map((f) =>
                    f.id === selectedField.field.id ? { ...f, type: e.target.value } : f,
                  ),
                }
              : s,
          );
          onUpdateFlow({ ...flow, sections });
        }}
      >
        {FIELD_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  );
}
