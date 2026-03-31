/**
 * use-marquee-selection.ts
 *
 * Hook para seleção por retângulo (marquee selection) no canvas.
 */

import * as React from "react";

export type SelectionRect = {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function useMarqueeSelection() {
  const isSelectingRef = React.useRef(false);
  const [isSelecting, setIsSelecting] = React.useState(false);

  const selectionStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = React.useState<SelectionRect>({
    visible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const beginSelection = React.useCallback(
    (screenPt: { x: number; y: number }) => {
      isSelectingRef.current = true;
      setIsSelecting(true);

      selectionStartRef.current = screenPt;
      setSelectionRect({
        visible: true,
        x: screenPt.x,
        y: screenPt.y,
        width: 0,
        height: 0,
      });
    },
    [],
  );

  const updateSelection = React.useCallback(
    (screenPt: { x: number; y: number }) => {
      const start = selectionStartRef.current;
      if (!start) return;

      const x = Math.min(start.x, screenPt.x);
      const y = Math.min(start.y, screenPt.y);
      const width = Math.abs(screenPt.x - start.x);
      const height = Math.abs(screenPt.y - start.y);

      setSelectionRect({ visible: true, x, y, width, height });
    },
    [],
  );

  const cancelSelection = React.useCallback(() => {
    setSelectionRect((r) => ({ ...r, visible: false }));
    isSelectingRef.current = false;
    setIsSelecting(false);
    selectionStartRef.current = null;
  }, []);

  return {
    isSelectingRef,
    isSelecting,
    selectionRect,
    setSelectionRect,
    beginSelection,
    updateSelection,
    cancelSelection,
    selectionStartRef,
  };
}

/**
 * Verifica se dois retângulos se intersectam.
 */
export function haveIntersection(
  a: { x: number; y: number; width: number; height: number },
  b: any,
) {
  return !(
    b.x > a.x + a.width ||
    b.x + b.width < a.x ||
    b.y > a.y + a.height ||
    b.y + b.height < a.y
  );
}
