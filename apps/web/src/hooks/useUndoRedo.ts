import { useCallback, useRef, useState } from "react";

export function useUndoRedo<T>(initial: T) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [state, setStateRaw] = useState(initial);
  const [historyTick, setHistoryTick] = useState(0);

  const bumpHistory = useCallback(() => setHistoryTick((n) => n + 1), []);

  const setState = useCallback(
    (next: T | ((prev: T) => T), recordHistory = true) => {
      setStateRaw((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (recordHistory && resolved !== prev) {
          past.current = [...past.current.slice(-49), prev];
          future.current = [];
          bumpHistory();
        }
        return resolved;
      });
    },
    [bumpHistory],
  );

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (previous === undefined) return;
    setStateRaw((current) => {
      future.current = [current, ...future.current];
      bumpHistory();
      return previous;
    });
  }, [bumpHistory]);

  const redo = useCallback(() => {
    const next = future.current.shift();
    if (next === undefined) return;
    setStateRaw((current) => {
      past.current = [...past.current, current];
      bumpHistory();
      return next;
    });
  }, [bumpHistory]);

  const reset = useCallback(
    (value: T) => {
      past.current = [];
      future.current = [];
      setStateRaw(value);
      bumpHistory();
    },
    [bumpHistory],
  );

  void historyTick;
  const canUndo = past.current.length > 0;
  const canRedo = future.current.length > 0;

  return { state, setState, undo, redo, reset, canUndo, canRedo };
}
