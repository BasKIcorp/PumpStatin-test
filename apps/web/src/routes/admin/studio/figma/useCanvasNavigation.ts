import { useCallback, useEffect, useRef, useState } from "react";

export function useCanvasNavigation(initialZoom = 0.55) {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
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
        setPan({
          x: panStartPos.current.x + (me.clientX - panStart.current.x),
          y: panStartPos.current.y + (me.clientY - panStart.current.y),
        });
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
      setZoom((z) => Math.max(0.15, Math.min(2, z + (e.deltaY > 0 ? -0.05 : 0.05))));
      return;
    }
    setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(2, z + 0.1));
  const zoomOut = () => setZoom((z) => Math.max(0.15, z - 0.1));
  const resetView = () => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  };

  const handActive = spaceHeld || isPanning;

  return {
    zoom,
    pan,
    handActive,
    startPan,
    handleWheel,
    zoomIn,
    zoomOut,
    resetView,
    spaceHeld,
  };
}
