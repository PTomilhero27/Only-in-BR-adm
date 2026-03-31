/**
 * use-undo-redo.ts
 *
 * Hook genérico de undo/redo.
 * Mantém past, present e future separados.
 */

import * as React from "react";

type UndoState<T> = { past: T[]; present: T; future: T[] };

function applySetStateAction<T>(prev: T, action: React.SetStateAction<T>): T {
  return typeof action === "function"
    ? (action as (prev: T) => T)(prev)
    : action;
}

export function useUndoRedo<T>(initial: T) {
  const [state, setState] = React.useState<UndoState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  const set = React.useCallback((action: React.SetStateAction<T>) => {
    setState((prev) => {
      const next = applySetStateAction(prev.present, action);
      if (Object.is(next, prev.present)) return prev;
      return { past: [...prev.past, prev.present], present: next, future: [] };
    });
  }, []);

  const undo = React.useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = React.useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: prev.future.slice(1),
      };
    });
  }, []);

  const reset = React.useCallback((next: T) => {
    setState({ past: [], present: next, future: [] });
  }, []);

  return { state, set, reset, undo, redo };
}
