/**
 * use-canvas-viewport.ts
 *
 * Hooks e helpers para pan/zoom/pinch do canvas Konva.
 */

import * as React from "react";

// ───────────────────────── Scale helpers ─────────────────────────

export function clampScale(next: number) {
  return Math.min(3, Math.max(0.35, next));
}

// ───────────────────────── Pinch helpers ─────────────────────────

export function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function mid(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// ───────────────────────── Viewport State ─────────────────────────

export type ViewportState = {
  scale: number;
  position: { x: number; y: number };
};

export function useCanvasViewport() {
  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const handleWheel = React.useCallback(
    (e: any) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const oldScale = scale;
      const scaleBy = 1.06;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = clampScale(
        direction > 0 ? oldScale * scaleBy : oldScale / scaleBy,
      );

      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setScale(newScale);
      setPosition(newPos);
    },
    [scale, position],
  );

  const fitToImage = React.useCallback(
    (
      bgImage: HTMLImageElement,
      stageSize: { width: number; height: number },
    ) => {
      const imgW = bgImage.width || 1;
      const imgH = bgImage.height || 1;

      const fit = clampScale(
        Math.min(stageSize.width / imgW, stageSize.height / imgH),
      );
      const renderedW = imgW * fit;
      const renderedH = imgH * fit;

      const x = (stageSize.width - renderedW) / 2;

      const TOP_PADDING = 12;
      const y =
        stageSize.height > renderedH
          ? TOP_PADDING
          : (stageSize.height - renderedH) / 2;

      setScale(fit);
      setPosition({ x, y });
    },
    [],
  );

  return {
    scale,
    setScale,
    position,
    setPosition,
    handleWheel,
    fitToImage,
  };
}

// ───────────────────────── Pinch Zoom ─────────────────────────

export type PinchState = {
  active: boolean;
  lastDist: number;
  lastCenter: { x: number; y: number };
};

export function usePinchZoom(
  scale: number,
  position: { x: number; y: number },
  setScale: (s: number) => void,
  setPosition: (p: { x: number; y: number }) => void,
) {
  const pinchRef = React.useRef<PinchState>({
    active: false,
    lastDist: 0,
    lastCenter: { x: 0, y: 0 },
  });

  const startPinch = React.useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      pinchRef.current = {
        active: true,
        lastDist: dist(p1, p2),
        lastCenter: mid(p1, p2),
      };
    },
    [],
  );

  const applyPinch = React.useCallback(
    (nextCenter: { x: number; y: number }, nextDist: number) => {
      const prev = pinchRef.current;
      const oldScale = scale;

      const scaleBy = nextDist / Math.max(1, prev.lastDist);
      const nextScale = clampScale(oldScale * scaleBy);

      const worldAtCenter = {
        x: (nextCenter.x - position.x) / oldScale,
        y: (nextCenter.y - position.y) / oldScale,
      };

      const nextPos = {
        x: nextCenter.x - worldAtCenter.x * nextScale,
        y: nextCenter.y - worldAtCenter.y * nextScale,
      };

      setScale(nextScale);
      setPosition(nextPos);

      pinchRef.current = {
        active: true,
        lastDist: nextDist,
        lastCenter: nextCenter,
      };
    },
    [scale, position, setScale, setPosition],
  );

  const endPinch = React.useCallback(() => {
    pinchRef.current.active = false;
  }, []);

  return { pinchRef, startPinch, applyPinch, endPinch };
}

// ───────────────────────── Touch Pan ─────────────────────────

export function useTouchPan(
  setPosition: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>,
) {
  const isTouchPanningRef = React.useRef(false);
  const lastPanPointRef = React.useRef<{ x: number; y: number } | null>(null);

  const startTouchPan = React.useCallback(
    (point: { x: number; y: number }) => {
      isTouchPanningRef.current = true;
      lastPanPointRef.current = point;
    },
    [],
  );

  const moveTouchPan = React.useCallback(
    (point: { x: number; y: number }) => {
      if (!isTouchPanningRef.current) return;
      const last = lastPanPointRef.current;
      if (last) {
        const dx = point.x - last.x;
        const dy = point.y - last.y;
        setPosition((p) => ({ x: p.x + dx, y: p.y + dy }));
      }
      lastPanPointRef.current = point;
    },
    [setPosition],
  );

  const endTouchPan = React.useCallback(() => {
    isTouchPanningRef.current = false;
    lastPanPointRef.current = null;
  }, []);

  return { isTouchPanningRef, lastPanPointRef, startTouchPan, moveTouchPan, endTouchPan };
}

// ───────────────────────── Coarse Pointer ─────────────────────────

export function useCoarsePointer() {
  const [isCoarsePointer, setIsCoarsePointer] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(pointer: coarse)");
    if (!mq) return;

    const apply = () => setIsCoarsePointer(!!mq.matches);
    apply();

    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return isCoarsePointer;
}

// ───────────────────────── Resize Observer ─────────────────────────

export function useStageSize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [stageSize, setStageSize] = React.useState({ width: 300, height: 300 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setStageSize({
        width: Math.max(300, rect.width),
        height: Math.max(300, rect.height),
      });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return stageSize;
}

// ───────────────────────── Touch helper ─────────────────────────

export function touchToContainerPoint(
  t: Touch,
  containerEl: HTMLElement | null,
) {
  if (!containerEl) return { x: t.clientX, y: t.clientY };
  const rect = containerEl.getBoundingClientRect();
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}
