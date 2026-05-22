import React from "react";
import {
  SELECTION_WORK_CANVAS,
  type SelectionWorkSlotType,
  isAbsoluteLayout,
  legacyComponentTypeToSlot,
} from "@/lib/selectionLayoutCanvas";

interface ComponentDef {
  id: string;
  type: string;
  position: { x: number; y: number; w: number; h: number };
  props: Record<string, unknown>;
}

export interface SelectionWorkLayoutData {
  grid?: Record<string, unknown>;
  components?: ComponentDef[];
  theme?: Record<string, unknown>;
}

export type SelectionWorkSlots = Partial<Record<SelectionWorkSlotType, React.ReactNode>>;

function slotFor(comp: ComponentDef): SelectionWorkSlotType | null {
  const pk = comp.props?.slotKey as string | undefined;
  if (pk && pk.startsWith("work_")) return pk as SelectionWorkSlotType;
  return legacyComponentTypeToSlot(comp.type);
}

/**
 * Абсолютный макет этапа «Работа»: координаты в px канвы SELECTION_WORK_CANVAS,
 * на экране переводятся в проценты для масштабирования.
 */
export function AbsoluteSelectionWorkCanvas({
  layout,
  slots,
  className,
}: {
  layout: SelectionWorkLayoutData;
  slots: SelectionWorkSlots;
  className?: string;
}) {
  const cw =
    Number((layout.grid as { canvasWidth?: number })?.canvasWidth) || SELECTION_WORK_CANVAS.width;
  const ch =
    Number((layout.grid as { canvasHeight?: number })?.canvasHeight) || SELECTION_WORK_CANVAS.height;
  const components = layout.components ?? [];

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: cw,
        margin: "0 auto",
        aspectRatio: `${cw} / ${ch}`,
        background: "var(--funnel-panel-header-bg)",
        borderRadius: 8,
        border: "1px solid rgb(212 212 216)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {layout.theme?.title && typeof layout.theme.title === "string" && (
          <div className="pointer-events-none absolute left-2 top-1 z-10 text-xs font-semibold text-zinc-600">
            {layout.theme.title}
          </div>
        )}
        {components.map((comp) => {
          const sk = slotFor(comp);
          const node = sk ? slots[sk] : null;
          const x = Number(comp.position?.x) || 0;
          const y = Number(comp.position?.y) || 0;
          const w = Math.max(80, Number(comp.position?.w) || 200);
          const h = Math.max(48, Number(comp.position?.h) || 120);
          const style: React.CSSProperties = {
            position: "absolute",
            left: `${(x / cw) * 100}%`,
            top: `${(y / ch) * 100}%`,
            width: `${(w / cw) * 100}%`,
            height: `${(h / ch) * 100}%`,
            boxSizing: "border-box",
          };
          return (
            <div
              key={comp.id}
              style={style}
              className="selection-work-panel min-h-0 overflow-hidden rounded-md"
            >
              {node ?? (
                <div className="flex h-full items-center justify-center p-2 text-center text-[11px] text-muted-foreground">
                  Нет блока «{sk || comp.type}»
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Если макет абсолютный и есть компоненты — рендер канвы; иначе children. */
export function SelectionWorkLayoutGate({
  layout,
  slots,
  children,
}: {
  layout: SelectionWorkLayoutData | null;
  slots: SelectionWorkSlots;
  children: React.ReactNode;
}) {
  if (!layout?.components?.length || !isAbsoluteLayout(layout.grid)) {
    return <>{children}</>;
  }
  return (
    <AbsoluteSelectionWorkCanvas layout={layout} slots={slots} className="min-h-[320px] w-full" />
  );
}
