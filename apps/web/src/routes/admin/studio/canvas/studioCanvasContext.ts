import { createContext, useContext } from "react";

/** @dnd-kit droppable id for page canvas (Grid + Auth) */
export const STUDIO_CANVAS_DROP_ZONE_ID = "canvas-drop-zone" as const;

/** Zoom applied to artboard in StudioCanvas — needed for react-rnd inside scaled transform */
export const StudioCanvasZoomContext = createContext(1);

export function useStudioCanvasZoom() {
  return useContext(StudioCanvasZoomContext);
}
