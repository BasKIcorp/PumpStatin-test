import { useCallback, useRef, useState, type ReactNode } from "react";

/**
 * Canvas с зумом, панарамированием и выделением.
 * Оборачивает children в scaled/translated контейнер.
 */
export function StudioCanvas({
  children,
  onSelect,
}: {
  children: ReactNode;
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panStartPos = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((z) => Math.max(0.2, Math.min(2, z + delta)));
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current || (e.target as HTMLElement).closest('[data-canvas-bg]')) {
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY };
        panStartPos.current = { x: pan.x, y: pan.y };
        onSelect(null);
      }
    },
    [pan, onSelect],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPan({
        x: panStartPos.current.x + dx,
        y: panStartPos.current.y + dy,
      });
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(2, z + 0.1));
  const zoomOut = () => setZoom((z) => Math.max(0.2, z - 0.1));
  const resetView = () => {
    setZoom(0.5);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
      {/* Панель инструментов */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-1.5">
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <span>Масштаб: {Math.round(zoom * 100)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            className="rounded px-2 py-0.5 text-xs hover:bg-neutral-100"
            title="Уменьшить"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            className="rounded px-2 py-0.5 text-xs hover:bg-neutral-100"
            title="Сбросить вид"
          >
            ⊞
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="rounded px-2 py-0.5 text-xs hover:bg-neutral-100"
            title="Увеличить"
          >
            +
          </button>
        </div>
      </div>

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Desktop preview frame */}
        <div
          className="absolute left-1/2 top-8 overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-lg"
          style={{
            width: 1024,
            minHeight: 700,
            transform: `translate(-50%, 0) scale(${zoom})`,
            transformOrigin: "top center",
          }}
        >
          <div data-canvas-bg className="min-h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
