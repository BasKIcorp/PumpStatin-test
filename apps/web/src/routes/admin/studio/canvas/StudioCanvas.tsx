import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FloatingZoom } from "../figma/FloatingZoom";
import { FIGMA } from "../figma/figmaTokens";
import { StudioCanvasZoomContext } from "./studioCanvasContext";

export function StudioCanvas({
  children,
  artboardLabel,
  artboardWidth = 1440,
  artboardMinHeight = 700,
  onSelect,
  onDropBlock,
}: {
  children: ReactNode;
  artboardLabel?: string;
  artboardWidth?: number;
  artboardMinHeight?: number;
  onSelect: (id: string | null) => void;
  onDropBlock?: (type: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !e.repeat &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        isPanningRef.current = false;
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const startPan = useCallback(
    (clientX: number, clientY: number) => {
      isPanningRef.current = true;
      setIsPanning(true);
      panStart.current = { x: clientX, y: clientY };
      panStartPos.current = { ...pan };

      const onMove = (me: MouseEvent) => {
        if (!isPanningRef.current) return;
        const dx = me.clientX - panStart.current.x;
        const dy = me.clientY - panStart.current.y;
        setPan({ x: panStartPos.current.x + dx, y: panStartPos.current.y + dy });
      };
      const onUp = () => {
        isPanningRef.current = false;
        setIsPanning(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [pan],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((z) => Math.max(0.15, Math.min(2, z + delta)));
      return;
    }
    setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (spaceHeld || e.button === 1) {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
        return;
      }

      // Only deselect on dotted outer background — not on artboard/blocks (breaks Rnd drag)
      if (e.target === containerRef.current && e.button === 0) {
        onSelect(null);
      }
    },
    [onSelect, spaceHeld, startPan],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("text/plain") || e.dataTransfer.types.includes("block-type")) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const type =
        e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("block-type");
      if (type && onDropBlock) onDropBlock(type);
    },
    [onDropBlock],
  );

  const zoomIn = () => setZoom((z) => Math.min(2, z + 0.1));
  const zoomOut = () => setZoom((z) => Math.max(0.15, z - 0.1));
  const resetView = () => {
    setZoom(0.55);
    setPan({ x: 0, y: 0 });
  };

  const handActive = spaceHeld || isPanning;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={containerRef}
        className={`relative h-full overflow-hidden ${handActive ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{
          backgroundColor: FIGMA.appBg,
          backgroundImage: `radial-gradient(circle, ${FIGMA.canvasDot} 1px, transparent 1px)`,
          backgroundSize: `${16 / zoom}px ${16 / zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="absolute left-1/2 top-0"
          style={{
            transform: `translate(calc(-50% + ${pan.x}px), ${48 + pan.y}px) scale(${zoom})`,
            transformOrigin: "top center",
          }}
        >
          {artboardLabel && (
            <div className="mb-1.5 flex items-center gap-2 pl-0.5">
              <span className="text-[11px] font-medium text-[#b3b3b3]">{artboardLabel}</span>
              <span className="font-mono text-[10px] text-[#666]">
                {artboardWidth} × auto
              </span>
            </div>
          )}
          <div
            data-canvas-bg
            className="overflow-hidden bg-white transition-shadow"
            style={{
              width: artboardWidth,
              minHeight: artboardMinHeight,
              boxShadow: FIGMA.artboardShadow,
              outline: isDragOver ? `2px solid ${FIGMA.accent}` : undefined,
            }}
            onDragOver={onDropBlock ? handleDragOver : undefined}
            onDragLeave={onDropBlock ? handleDragLeave : undefined}
            onDrop={onDropBlock ? handleDrop : undefined}
          >
            <StudioCanvasZoomContext.Provider value={zoom}>
              {children}
            </StudioCanvasZoomContext.Provider>
          </div>
        </div>

        <FloatingZoom zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onFit={resetView} />
      </div>
    </div>
  );
}
