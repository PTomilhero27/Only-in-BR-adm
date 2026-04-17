"use client";

import * as React from "react";
import type Konva from "konva";
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Transformer,
  Rect,
  Line,
} from "react-konva";
import useImage from "use-image";

import type { MapElement, MapTool } from "../../types/types";
import { safeNumber } from "./map-utils";

import {
  useCanvasViewport,
  usePinchZoom,
  useTouchPan,
  useCoarsePointer,
  useStageSize,
  touchToContainerPoint,
  dist,
  mid,
  type ViewportBounds,
} from "./use-canvas-viewport";

import {
  useMarqueeSelection,
  haveIntersection,
} from "./use-marquee-selection";

import { RectLikeElement } from "./canvas-elements/rect-element";
import { LineElement } from "./canvas-elements/line-element";
import { TextCanvasElement } from "./canvas-elements/text-element";
import { CircleCanvasElement } from "./canvas-elements/circle-element";
import { TreeCanvasElement } from "./canvas-elements/tree-element";

// ───────────────────────── LineDraft type ─────────────────────────

export type LineDraft = {
  active: boolean;
  points: number[];
  preview: { x: number; y: number } | null;
};

function mergeBounds(
  current: ViewportBounds | null,
  next: ViewportBounds | null,
): ViewportBounds | null {
  if (!current) return next;
  if (!next) return current;

  return {
    minX: Math.min(current.minX, next.minX),
    minY: Math.min(current.minY, next.minY),
    maxX: Math.max(current.maxX, next.maxX),
    maxY: Math.max(current.maxY, next.maxY),
  };
}

function getElementBounds(el: MapElement): ViewportBounds | null {
  if (el.type === "RECT" || el.type === "SQUARE" || el.type === "BOOTH_SLOT") {
    const width = Math.max(10, safeNumber((el as any).width, 60));
    const height = Math.max(10, safeNumber((el as any).height, 60));
    return {
      minX: safeNumber(el.x, 0),
      minY: safeNumber(el.y, 0),
      maxX: safeNumber(el.x, 0) + width,
      maxY: safeNumber(el.y, 0) + height,
    };
  }

  if (el.type === "CIRCLE") {
    const radius = Math.max(10, safeNumber((el as any).radius, 45));
    return {
      minX: safeNumber(el.x, 0) - radius,
      minY: safeNumber(el.y, 0) - radius,
      maxX: safeNumber(el.x, 0) + radius,
      maxY: safeNumber(el.y, 0) + radius,
    };
  }

  if (el.type === "TREE") {
    const radius = Math.max(6, safeNumber((el as any).radius, 14));
    return {
      minX: safeNumber(el.x, 0) - radius,
      minY: safeNumber(el.y, 0) - radius,
      maxX: safeNumber(el.x, 0) + radius,
      maxY: safeNumber(el.y, 0) + radius,
    };
  }

  if (el.type === "TEXT") {
    const textValue = String((el as any).text ?? (el as any).label ?? "");
    const fontSize = safeNumber(
      (el as any).fontSize ?? (el as any).style?.fontSize,
      18,
    );
    const padding = safeNumber(
      (el as any).padding ?? (el as any).style?.padding,
      8,
    );
    const boxed = Boolean((el as any).boxed ?? (el as any).style?.boxed);

    const width = boxed
      ? Math.max(60, textValue.length * (fontSize * 0.62)) + padding * 2
      : Math.max(fontSize, textValue.length * (fontSize * 0.62));
    const height = boxed ? fontSize + padding * 2 : fontSize;

    return {
      minX: safeNumber(el.x, 0),
      minY: safeNumber(el.y, 0),
      maxX: safeNumber(el.x, 0) + width,
      maxY: safeNumber(el.y, 0) + height,
    };
  }

  if (el.type === "LINE") {
    const points = Array.isArray((el as any).points) ? (el as any).points : [];
    if (points.length < 2) return null;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < points.length; i += 2) {
      const x = safeNumber(points[i], 0);
      const y = safeNumber(points[i + 1], 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }

    const strokeInset = Math.max(
      2,
      safeNumber((el as any).style?.strokeWidth, 3),
    );

    return {
      minX: minX - strokeInset,
      minY: minY - strokeInset,
      maxX: maxX + strokeInset,
      maxY: maxY + strokeInset,
    };
  }

  return null;
}

function getElementsBounds(elements: MapElement[]) {
  return elements.reduce<ViewportBounds | null>(
    (bounds, el) => mergeBounds(bounds, getElementBounds(el)),
    null,
  );
}

// ───────────────────────── Props ─────────────────────────

type Props = {
  backgroundUrl?: string;

  elements: MapElement[];
  setElements: React.Dispatch<React.SetStateAction<MapElement[]>>;

  isEditMode: boolean;
  tool: MapTool;

  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;

  onCreateAtPoint?: (pt: { x: number; y: number }) => void;

  linkedBoothIds?: Set<string>;

  /** Mapa clientKey → { commercialStatus, priceCents } para colorir booths */
  slotStatusMap?: Map<string, { commercialStatus: string; priceCents: number }>;

  enableOperationalBoothClick?: boolean;
  onBoothClick?: (boothId: string) => void;

  viewportToken?: number;

  lineDraft?: LineDraft;
  onLineDraftChange?: (next: LineDraft) => void;
  onFinishLineDraft?: () => void;
};

// ───────────────────────── Component ─────────────────────────

export function FairMap2DCanvas({
  backgroundUrl,
  elements,
  setElements,
  isEditMode,
  tool,
  selectedIds,
  onSelectIds,
  onCreateAtPoint,
  linkedBoothIds,
  slotStatusMap,
  enableOperationalBoothClick,
  onBoothClick,
  viewportToken,
  lineDraft,
  onLineDraftChange,
  onFinishLineDraft,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const stageRef = React.useRef<Konva.Stage | null>(null);
  const trRef = React.useRef<Konva.Transformer | null>(null);
  const allowAutoFitRef = React.useRef(true);
  const lastAutoFitKeyRef = React.useRef<string | null>(null);

  // Viewport
  const stageSize = useStageSize(containerRef);
  const { scale, setScale, position, setPosition, handleWheel, fitToBounds } =
    useCanvasViewport();
  const isCoarsePointer = useCoarsePointer();

  // Marquee Selection
  const {
    isSelectingRef,
    isSelecting,
    selectionRect,
    setSelectionRect,
    beginSelection,
    updateSelection,
    cancelSelection,
  } = useMarqueeSelection();

  // Touch
  const { startPinch, applyPinch, endPinch, pinchRef } = usePinchZoom(
    scale,
    position,
    setScale,
    setPosition,
  );
  const { isTouchPanningRef, startTouchPan, moveTouchPan, endTouchPan } =
    useTouchPan(setPosition);

  // Node drag
  const isNodeDraggingRef = React.useRef(false);
  const [isNodeDragging, setIsNodeDragging] = React.useState(false);

  // Background
  const [bgImage] = useImage(backgroundUrl ?? "", "anonymous");

  const contentBounds = React.useMemo(() => {
    const backgroundBounds = bgImage
      ? {
          minX: 0,
          minY: 0,
          maxX: bgImage.width || 1,
          maxY: bgImage.height || 1,
        }
      : null;

    return mergeBounds(backgroundBounds, getElementsBounds(elements));
  }, [bgImage, elements]);

  const markViewportAsAdjusted = React.useCallback(() => {
    allowAutoFitRef.current = false;
  }, []);

  React.useEffect(() => {
    if (viewportToken == null) return;
    allowAutoFitRef.current = true;
    lastAutoFitKeyRef.current = null;
  }, [viewportToken]);

  React.useEffect(() => {
    if (!contentBounds) return;
    if (!allowAutoFitRef.current) return;

    const fitKey = [
      viewportToken ?? "default",
      stageSize.width,
      stageSize.height,
      contentBounds.minX,
      contentBounds.minY,
      contentBounds.maxX,
      contentBounds.maxY,
    ].join(":");

    if (lastAutoFitKeyRef.current === fitKey) return;

    fitToBounds(contentBounds, stageSize);
    lastAutoFitKeyRef.current = fitKey;
  }, [contentBounds, fitToBounds, stageSize.height, stageSize.width, viewportToken]);

  const stageDraggable =
    tool === "SELECT" && !isCoarsePointer && !isSelecting && !isNodeDragging;

  // transformer nodes
  React.useEffect(() => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;

    if (!isEditMode || tool !== "SELECT" || selectedIds.length === 0) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const nodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter(Boolean) as any[];

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, isEditMode, tool, elements]);

  // ───── Helpers ─────

  function isMapAreaTarget(target: any) {
    return target === target.getStage() || target.getClassName?.() === "Image";
  }

  function toWorldPoint(screen: { x: number; y: number }) {
    return {
      x: (screen.x - position.x) / scale,
      y: (screen.y - position.y) / scale,
    };
  }

  function endSelection(additive: boolean) {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = selectionRect;

    cancelSelection();

    if (rect.width < 6 || rect.height < 6) return;

    const selected: string[] = [];

    stage.find(".selectable").forEach((node: any) => {
      const box = node.getClientRect({ relativeTo: stage });
      if (haveIntersection(rect, box)) {
        const id = node.id();
        if (id) selected.push(id);
      }
    });

    onSelectIds(
      additive ? Array.from(new Set([...selectedIds, ...selected])) : selected,
    );
  }

  // ───── Commit helpers ─────

  function commitPositionFromNode(id: string, node: any) {
    const x = safeNumber(node.x?.(), 0);
    const y = safeNumber(node.y?.(), 0);
    const rotation = safeNumber(node.rotation?.(), 0);

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        return { ...(el as any), x, y, rotation };
      }),
    );
  }

  function commitTransformFromNode(id: string, node: any) {
    const rotation = safeNumber(node.rotation?.(), 0);
    const x = safeNumber(node.x?.(), 0);
    const y = safeNumber(node.y?.(), 0);

    const scaleX = safeNumber(node.scaleX?.(), 1);
    const scaleY = safeNumber(node.scaleY?.(), 1);

    node.scaleX(1);
    node.scaleY(1);

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;

        if (
          el.type === "RECT" ||
          el.type === "SQUARE" ||
          el.type === "BOOTH_SLOT"
        ) {
          const w0 = safeNumber((el as any).width, 60);
          const h0 = safeNumber((el as any).height, 60);

          const nextWidth = Math.max(10, w0 * scaleX);
          const nextHeight = Math.max(10, h0 * scaleY);

          if (el.type === "SQUARE" || el.type === "BOOTH_SLOT") {
            const size = Math.max(10, Math.max(nextWidth, nextHeight));
            return { ...(el as any), x, y, rotation, width: size, height: size };
          }

          return { ...(el as any), x, y, rotation, width: nextWidth, height: nextHeight };
        }

        if (el.type === "TEXT") {
          return { ...(el as any), x, y, rotation };
        }

        if (el.type === "TREE") {
          const r0 = safeNumber((el as any).radius, 14);
          const radius = Math.max(6, r0 * Math.max(scaleX, scaleY));
          return { ...(el as any), x, y, rotation, radius };
        }

        if (el.type === "CIRCLE") {
          const r0 = safeNumber((el as any).radius, 45);
          const radius = Math.max(10, r0 * Math.max(scaleX, scaleY));
          return { ...(el as any), x, y, rotation, radius };
        }

        return { ...(el as any), x, y, rotation };
      }),
    );
  }

  // ───── Line Draft helpers ─────

  function updateLinePreviewFromPointer() {
    const stage = stageRef.current;
    if (!stage) return;
    if (!lineDraft?.active) return;
    const p = stage.getPointerPosition();
    if (!p) return;
    const world = toWorldPoint(p);
    onLineDraftChange?.({ ...lineDraft, preview: world });
  }

  function addLinePointFromPointer() {
    const stage = stageRef.current;
    if (!stage) return;
    const p = stage.getPointerPosition();
    if (!p) return;
    const world = toWorldPoint(p);

    if (!lineDraft?.active) {
      onLineDraftChange?.({
        active: true,
        points: [Math.round(world.x), Math.round(world.y)],
        preview: world,
      });
      return;
    }

    onLineDraftChange?.({
      ...lineDraft,
      points: [...lineDraft.points, Math.round(world.x), Math.round(world.y)],
      preview: world,
    });
  }

  const ghostPoints = React.useMemo(() => {
    if (!lineDraft?.active) return null;
    if (!lineDraft.preview) return lineDraft.points;
    return [
      ...lineDraft.points,
      Math.round(lineDraft.preview.x),
      Math.round(lineDraft.preview.y),
    ];
  }, [lineDraft]);

  // ───── Shared props for element sub-components ─────

  const sharedElementProps = {
    linkedBoothIds,
    slotStatusMap,
    enableOperationalBoothClick,
    onBoothClick,
    isEditMode,
    commitPositionFromNode,
    commitTransformFromNode,
    setIsNodeDragging,
    isNodeDraggingRef,
  };

  // ───── Render ─────

  return (
    <div
      ref={containerRef}
      className="h-full w-full touch-none"
      style={{ touchAction: "none" }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={stageDraggable}
        onWheel={(e) => {
          markViewportAsAdjusted();
          handleWheel(e);
        }}
        onDragStart={(e) => {
          if (e.target === stageRef.current) {
            markViewportAsAdjusted();
          }
        }}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setPosition({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onMouseMove={() => {
          updateLinePreviewFromPointer();

          const stage = stageRef.current;
          if (!stage) return;
          if (!isSelectingRef.current) return;

          const p = stage.getPointerPosition();
          if (!p) return;
          updateSelection(p);
        }}
        onMouseDown={(e) => {
          const stage = stageRef.current;
          if (!stage) return;

          const target = e.target;

          if (isEditMode && tool === "LINE" && isMapAreaTarget(target)) {
            addLinePointFromPointer();
            return;
          }

          if (
            isEditMode &&
            tool !== "SELECT" &&
            tool !== "LINE" &&
            isMapAreaTarget(target)
          ) {
            const p = stage.getPointerPosition();
            if (!p) return;
            const world = toWorldPoint(p);
            onCreateAtPoint?.(world);
            return;
          }

          if (isEditMode && tool === "SELECT" && isMapAreaTarget(target)) {
            const p = stage.getPointerPosition();
            if (!p) return;

            const additive = e.evt.shiftKey === true;
            if (!additive) onSelectIds([]);

            beginSelection(p);
          }

          if (!isEditMode && isMapAreaTarget(target)) {
            onSelectIds([]);
          }
        }}
        onMouseUp={(e) => {
          if (!isSelectingRef.current) return;
          const additive = e.evt.shiftKey === true;
          endSelection(additive);
        }}
        onDblClick={() => {
          if (isEditMode && tool === "LINE" && lineDraft?.active) {
            onFinishLineDraft?.();
          }
        }}
        onTouchStart={(e) => {
          const stage = stageRef.current;
          if (!stage) return;

          e.evt.preventDefault();

          const touches = e.evt.touches;
          const target = e.target;

          if (touches && touches.length === 2) {
            markViewportAsAdjusted();
            const p1 = touchToContainerPoint(touches[0], containerRef.current);
            const p2 = touchToContainerPoint(touches[1], containerRef.current);
            startPinch(p1, p2);

            isTouchPanningRef.current = false;

            isSelectingRef.current = false;
            cancelSelection();

            return;
          }

          if (touches && touches.length === 1) {
            if (tool === "SELECT" && isMapAreaTarget(target)) {
              markViewportAsAdjusted();
              startTouchPan(touchToContainerPoint(touches[0], containerRef.current));
              return;
            }
          }

          if (isEditMode && tool === "LINE" && isMapAreaTarget(target)) {
            addLinePointFromPointer();
            return;
          }

          if (
            isEditMode &&
            tool !== "SELECT" &&
            tool !== "LINE" &&
            isMapAreaTarget(target)
          ) {
            const p = stage.getPointerPosition();
            if (!p) return;
            const world = toWorldPoint(p);
            onCreateAtPoint?.(world);
            return;
          }

          if (!isEditMode && isMapAreaTarget(target)) {
            onSelectIds([]);
          }
        }}
        onTouchMove={(e) => {
          const stage = stageRef.current;
          if (!stage) return;

          e.evt.preventDefault();

          const touches = e.evt.touches;

          if (touches && touches.length === 2) {
            const p1 = touchToContainerPoint(touches[0], containerRef.current);
            const p2 = touchToContainerPoint(touches[1], containerRef.current);
            const center = mid(p1, p2);
            const d = dist(p1, p2);
            applyPinch(center, d);
            return;
          }

          if (touches && touches.length === 1 && isTouchPanningRef.current) {
            moveTouchPan(touchToContainerPoint(touches[0], containerRef.current));
            return;
          }

          updateLinePreviewFromPointer();

          if (!isSelectingRef.current) return;
          const p = stage.getPointerPosition();
          if (!p) return;
          updateSelection(p);
        }}
        onTouchEnd={(e) => {
          const touches = e.evt.touches;

          if (!touches || touches.length < 2) {
            endPinch();
          }

          if (!touches || touches.length === 0) {
            endTouchPan();
          }

          if (!isSelectingRef.current) return;
          endSelection(false);
        }}
      >
        <Layer>
          {bgImage ? <KonvaImage image={bgImage} x={0} y={0} /> : null}

          {elements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const canEditNode =
              isEditMode && tool === "SELECT" && selectedIds.length > 0;

            const commonProps = {
              element: el,
              isSelected,
              canEditNode,
              selectedIds,
              onSelectIds,
              ...sharedElementProps,
            };

            if (
              el.type === "RECT" ||
              el.type === "SQUARE" ||
              el.type === "BOOTH_SLOT"
            ) {
              return <RectLikeElement key={el.id} {...commonProps} />;
            }

            if (el.type === "LINE") {
              return <LineElement key={el.id} {...commonProps} />;
            }

            if (el.type === "TEXT") {
              return <TextCanvasElement key={el.id} {...commonProps} />;
            }

            if (el.type === "CIRCLE") {
              return <CircleCanvasElement key={el.id} {...commonProps} />;
            }

            if (el.type === "TREE") {
              return <TreeCanvasElement key={el.id} {...commonProps} />;
            }

            return null;
          })}

          {isEditMode &&
          tool === "LINE" &&
          lineDraft?.active &&
          ghostPoints &&
          ghostPoints.length >= 2 ? (
            <Line
              points={ghostPoints}
              stroke="#0EA5E9"
              strokeWidth={3}
              opacity={0.65}
              lineCap="round"
              lineJoin="round"
              listening={false}
              dash={[10, 8]}
            />
          ) : null}

          {selectionRect.visible ? (
            <Rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill="rgba(14,165,233,0.08)"
              stroke="rgba(14,165,233,0.9)"
              strokeWidth={1.5}
              dash={[8, 6]}
              listening={false}
            />
          ) : null}

          {isEditMode && tool === "SELECT" ? (
            <Transformer
              ref={trRef}
              rotateEnabled
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
                "middle-left",
                "middle-right",
                "top-center",
                "bottom-center",
              ]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 10 || newBox.height < 10) return oldBox;
                return newBox;
              }}
              onTransformEnd={() => {
                const tr = trRef.current;
                if (!tr) return;

                const nodes = tr.nodes();
                nodes.forEach((node: any) => {
                  const id = node.id();
                  if (!id) return;
                  commitTransformFromNode(id, node);
                });
              }}
            />
          ) : null}
        </Layer>
      </Stage>
    </div>
  );
}
