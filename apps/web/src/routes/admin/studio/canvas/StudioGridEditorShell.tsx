import type { ReactNode } from "react";
import { useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { StudioCanvas } from "./StudioCanvas";
import { StudioLeftSidebar } from "@/routes/admin/studio/figma/StudioLeftSidebar";
import { StudioRightSidebar } from "@/routes/admin/studio/figma/StudioRightSidebar";

export function StudioGridEditorShell({
  layers,
  assets,
  rightSidebar,
  canvasToolbar,
  artboardLabel,
  artboardWidth,
  artboardMinHeight,
  viewportGuideWidth,
  highlightWorkArea,
  onCanvasSelect,
  onDropBlock,
  canvas,
  dragOverlay,
  onDragStart,
  onDragEnd,
  selectedBlockId,
  onClearSelection,
  onDeleteSelected,
  onRotateSelected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  layers: ReactNode;
  assets: ReactNode;
  rightSidebar: ReactNode;
  canvasToolbar?: ReactNode;
  artboardLabel: string;
  artboardWidth: number;
  artboardMinHeight: number;
  viewportGuideWidth?: number;
  highlightWorkArea?: boolean;
  onCanvasSelect: (id: string | null) => void;
  onDropBlock?: (type: string) => void;
  canvas: ReactNode;
  dragOverlay?: ReactNode;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  selectedBlockId?: string | null;
  onClearSelection?: () => void;
  onDeleteSelected?: () => void;
  onRotateSelected?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Escape") onClearSelection?.();
      if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockId) {
        e.preventDefault();
        onDeleteSelected?.();
      }
      if (
        (e.key === "r" || e.key === "R") &&
        selectedBlockId &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        onRotateSelected?.();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && canUndo) {
        e.preventDefault();
        onUndo?.();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey)) &&
        canRedo
      ) {
        e.preventDefault();
        onRedo?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedBlockId,
    onClearSelection,
    onDeleteSelected,
    onRotateSelected,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  ]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full min-h-0 flex-1 overflow-hidden">
        <StudioLeftSidebar layers={layers} assets={assets} />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {canvasToolbar}
          <StudioCanvas
            artboardLabel={artboardLabel}
            artboardWidth={artboardWidth}
            artboardMinHeight={artboardMinHeight}
            viewportGuideWidth={viewportGuideWidth}
            highlightWorkArea={highlightWorkArea}
            onSelect={onCanvasSelect}
            onDropBlock={onDropBlock}
          >
            {canvas}
          </StudioCanvas>
        </div>

        <StudioRightSidebar>{rightSidebar}</StudioRightSidebar>
      </div>

      <DragOverlay>{dragOverlay}</DragOverlay>
    </DndContext>
  );
}
