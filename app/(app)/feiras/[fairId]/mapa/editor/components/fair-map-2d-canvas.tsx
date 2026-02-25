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
  Text,
  Circle,
  Group,
} from "react-konva";
import useImage from "use-image";

import type { MapElement, MapTool } from "../../types/types";

/**
 * LineDraft (desenho click-and-click)
 * - O estado fica no MapaClient para hotkeys globais (Esc/Enter/Backspace).
 */
type LineDraft = {
  active: boolean;
  points: number[];
  preview: { x: number; y: number } | null;
};

type Props = {
  backgroundUrl?: string;

  elements: MapElement[];
  setElements: React.Dispatch<React.SetStateAction<MapElement[]>>;

  isEditMode: boolean;
  tool: MapTool;

  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;

  onCreateAtPoint?: (pt: { x: number; y: number }) => void;

  /**
   * IDs (ou clientKeys) de BOOTHs vinculadas.
   * Obs: dependendo do adapter, o elemento pode ter id=clientKey ou id=uuid.
   * Então o canvas checa os dois.
   */
  linkedBoothIds?: Set<string>;

  enableOperationalBoothClick?: boolean;
  onBoothClick?: (boothId: string) => void;

  viewportToken?: number;

  lineDraft?: LineDraft;
  onLineDraftChange?: (next: LineDraft) => void;
  onFinishLineDraft?: () => void;
};

function clampScale(next: number) {
  return Math.min(3, Math.max(0.35, next));
}

function haveIntersection(
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

// ===== Pinch helpers =====
function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function mid(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Normaliza number:
 * - evita NaN
 * - aplica fallback
 */
function safeNumber(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Normaliza style:
 * - evita crashes quando style vier null/undefined
 * - mantém defaults consistentes
 */
function safeStyle(style: any) {
  const fallback = {
    fill: "#CBD5E1",
    stroke: "#0F172A",
    strokeWidth: 2,
    opacity: 0.75,
  };

  if (!style || typeof style !== "object") return fallback;

  return {
    fill: typeof style.fill === "string" ? style.fill : fallback.fill,
    stroke: typeof style.stroke === "string" ? style.stroke : fallback.stroke,
    strokeWidth:
      typeof style.strokeWidth === "number"
        ? style.strokeWidth
        : fallback.strokeWidth,
    opacity:
      typeof style.opacity === "number" ? style.opacity : fallback.opacity,
  };
}

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

  const [stageSize, setStageSize] = React.useState({ width: 300, height: 300 });

  // pan/zoom
  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });

  const [bgImage] = useImage(backgroundUrl ?? "", "anonymous");

  // marquee selection
  const isSelectingRef = React.useRef(false);
  const [isSelecting, setIsSelecting] = React.useState(false);

  const selectionStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
  }>({ visible: false, x: 0, y: 0, width: 0, height: 0 });

  // multi-drag
  const dragStartRef = React.useRef<{
    ids: string[];
    start: Record<string, { x: number; y: number }>;
    anchorId: string | null;
  } | null>(null);

  const isNodeDraggingRef = React.useRef(false);
  const [isNodeDragging, setIsNodeDragging] = React.useState(false);

  // touch pan
  const isTouchPanningRef = React.useRef(false);
  const lastPanPointRef = React.useRef<{ x: number; y: number } | null>(null);

  // pinch
  const pinchRef = React.useRef<{
    active: boolean;
    lastDist: number;
    lastCenter: { x: number; y: number };
  }>({ active: false, lastDist: 0, lastCenter: { x: 0, y: 0 } });

  // coarse pointer (mobile/tablet)
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

  // resize observer
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
  }, []);

  function handleWheel(e: any) {
    e.evt.preventDefault();
    const stage = stageRef.current;
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
  }

  // Fit inicial do background
  const didInitRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!bgImage || !backgroundUrl) return;

    if (didInitRef.current === backgroundUrl && viewportToken == null) return;

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

    didInitRef.current = backgroundUrl;
  }, [
    bgImage,
    backgroundUrl,
    stageSize.width,
    stageSize.height,
    viewportToken,
  ]);

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

  function isMapAreaTarget(target: any) {
    return target === target.getStage() || target.getClassName?.() === "Image";
  }

  function toWorldPoint(screen: { x: number; y: number }) {
    return {
      x: (screen.x - position.x) / scale,
      y: (screen.y - position.y) / scale,
    };
  }

  function beginSelection(screenPt: { x: number; y: number }) {
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
  }

  function updateSelection(screenPt: { x: number; y: number }) {
    const start = selectionStartRef.current;
    if (!start) return;

    const x = Math.min(start.x, screenPt.x);
    const y = Math.min(start.y, screenPt.y);
    const width = Math.abs(screenPt.x - start.x);
    const height = Math.abs(screenPt.y - start.y);

    setSelectionRect({ visible: true, x, y, width, height });
  }

  function endSelection(additive: boolean) {
    const stage = stageRef.current;
    if (!stage) return;

    const rect = selectionRect;

    setSelectionRect((r) => ({ ...r, visible: false }));
    isSelectingRef.current = false;
    setIsSelecting(false);

    selectionStartRef.current = null;

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

  function commitTransformFromNode(id: string, node: any) {
    const rotation = node.rotation();
    const x = node.x();
    const y = node.y();

    const scaleX = safeNumber(node.scaleX?.(), 1);
    const scaleY = safeNumber(node.scaleY?.(), 1);

    node.scaleX(1);
    node.scaleY(1);

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;

        if (el.type === "RECT") {
          const w0 = safeNumber((el as any).width, 60);
          const h0 = safeNumber((el as any).height, 60);

          const width = Math.max(10, w0 * scaleX);
          const height = Math.max(10, h0 * scaleY);

          return { ...(el as any), x, y, rotation, width, height };
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

  function touchToContainerPoint(t: Touch) {
    const el = containerRef.current;
    if (!el) return { x: t.clientX, y: t.clientY };
    const rect = el.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function applyPinch(nextCenter: { x: number; y: number }, nextDist: number) {
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
  }

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
        onWheel={handleWheel}
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

          // LINE click-and-click
          if (isEditMode && tool === "LINE" && isMapAreaTarget(target)) {
            addLinePointFromPointer();
            return;
          }

          // Criação de elementos (exceto LINE/SELECT)
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

          // Marquee selection
          if (isEditMode && tool === "SELECT" && isMapAreaTarget(target)) {
            const p = stage.getPointerPosition();
            if (!p) return;

            const additive = e.evt.shiftKey === true;
            if (!additive) onSelectIds([]);

            beginSelection(p);
          }

          // Modo operacional: clique no vazio limpa seleção
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
        // -------- TOUCH (mobile) --------
        onTouchStart={(e) => {
          const stage = stageRef.current;
          if (!stage) return;

          e.evt.preventDefault();

          const touches = e.evt.touches;
          const target = e.target;

          // 2 dedos = pinch
          if (touches && touches.length === 2) {
            const p1 = touchToContainerPoint(touches[0]);
            const p2 = touchToContainerPoint(touches[1]);
            pinchRef.current = {
              active: true,
              lastDist: dist(p1, p2),
              lastCenter: mid(p1, p2),
            };

            isTouchPanningRef.current = false;
            lastPanPointRef.current = null;

            isSelectingRef.current = false;
            setIsSelecting(false);
            setSelectionRect((r) => ({ ...r, visible: false }));

            return;
          }

          // 1 dedo no vazio + SELECT = pan manual
          if (touches && touches.length === 1) {
            if (tool === "SELECT" && isMapAreaTarget(target)) {
              isTouchPanningRef.current = true;
              lastPanPointRef.current = touchToContainerPoint(touches[0]);
              return;
            }
          }

          // LINE click-and-click (touch)
          if (isEditMode && tool === "LINE" && isMapAreaTarget(target)) {
            addLinePointFromPointer();
            return;
          }

          // Criação de elementos
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

          // Operacional: limpa seleção no vazio
          if (!isEditMode && isMapAreaTarget(target)) {
            onSelectIds([]);
          }
        }}
        onTouchMove={(e) => {
          const stage = stageRef.current;
          if (!stage) return;

          e.evt.preventDefault();

          const touches = e.evt.touches;

          // pinch
          if (touches && touches.length === 2) {
            const p1 = touchToContainerPoint(touches[0]);
            const p2 = touchToContainerPoint(touches[1]);
            const center = mid(p1, p2);
            const d = dist(p1, p2);
            applyPinch(center, d);
            return;
          }

          // pan manual (1 dedo)
          if (touches && touches.length === 1 && isTouchPanningRef.current) {
            const now = touchToContainerPoint(touches[0]);
            const last = lastPanPointRef.current;
            if (last) {
              const dx = now.x - last.x;
              const dy = now.y - last.y;
              setPosition((p) => ({ x: p.x + dx, y: p.y + dy }));
            }
            lastPanPointRef.current = now;
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
            pinchRef.current.active = false;
          }

          if (!touches || touches.length === 0) {
            isTouchPanningRef.current = false;
            lastPanPointRef.current = null;
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

            const s = safeStyle((el as any).style);

            // ========= RECT (BOOTH/RECT/SQUARE) =========
            if (el.type === "RECT") {
              const x = safeNumber(el.x, 0);
              const y = safeNumber(el.y, 0);
              const rotation = safeNumber(el.rotation, 0);
              const w = Math.max(10, safeNumber((el as any).width, 60));
              const h = Math.max(10, safeNumber((el as any).height, 60));

              const isBooth = (el as any).rectKind === "BOOTH";

              // ✅ vínculo pode estar por id OU por clientKey dependendo do adapter
              const linkKey = (el as any).clientKey ?? el.id;
              const isLinked = isBooth
                ? !!linkedBoothIds?.has(linkKey) || !!linkedBoothIds?.has(el.id)
                : false;

              const displayText = isBooth
                ? typeof (el as any).number === "number"
                  ? String((el as any).number)
                  : ""
                : (el as any).label?.trim()
                  ? String((el as any).label)
                  : "";

              /**
               * ✅ FIX: antes o BOOTH ignorava a cor do style e sempre pintava com boothFill/boothStroke.
               * Agora:
               * - base = style.fill/style.stroke (com defaults de BOOTH se não vier)
               * - se estiver vinculado, sobrescreve com verde (padrão operacional)
               */
              const boothDefaultFill = "#FEF9C3";
              const boothDefaultStroke = "#CA8A04";

              const boothBaseFill =
                typeof (el as any)?.style?.fill === "string"
                  ? (el as any).style.fill
                  : boothDefaultFill;

              const boothBaseStroke =
                typeof (el as any)?.style?.stroke === "string"
                  ? (el as any).style.stroke
                  : boothDefaultStroke;

              const boothBaseStrokeWidth =
                typeof (el as any)?.style?.strokeWidth === "number"
                  ? (el as any).style.strokeWidth
                  : 2;

              const nodeOpacity = isBooth
                ? safeNumber((el as any)?.style?.opacity, 0.85)
                : safeNumber(s.opacity, 1);

              const fill = isBooth
                ? isLinked
                  ? "#BBF7D0"
                  : boothBaseFill
                : s.fill;

              const stroke = isSelected
                ? "#0EA5E9"
                : isBooth
                  ? isLinked
                    ? "#16A34A"
                    : boothBaseStroke
                  : s.stroke;

              const strokeWidth = isSelected
                ? Math.max(2, safeNumber(boothBaseStrokeWidth, 2))
                : safeNumber(isBooth ? boothBaseStrokeWidth : s.strokeWidth, 2);

              const groupProps: any = {
                id: el.id,
                name: "selectable",
                x,
                y,
                rotation,
                opacity: nodeOpacity,
                draggable: canEditNode && isSelected,

                onClick: (evt: any) => {
                  evt.cancelBubble = true;
                  const additive = evt.evt.shiftKey === true;

                  if (additive) {
                    onSelectIds(
                      isSelected
                        ? selectedIds.filter((v) => v !== el.id)
                        : [...selectedIds, el.id],
                    );
                  } else {
                    onSelectIds([el.id]);
                  }

                  if (!isEditMode && enableOperationalBoothClick && isBooth) {
                    onBoothClick?.(el.id);
                  }
                },
                onTap: (evt: any) => {
                  evt.cancelBubble = true;
                  onSelectIds([el.id]);
                  if (!isEditMode && enableOperationalBoothClick && isBooth) {
                    onBoothClick?.(el.id);
                  }
                },

                onDragStart: (evt: any) => {
                  evt.cancelBubble = true;
                  isNodeDraggingRef.current = true;
                  setIsNodeDragging(true);
                },

                onDragEnd: (evt: any) => {
                  evt.cancelBubble = true;
                  isNodeDraggingRef.current = false;
                  setIsNodeDragging(false);
                },

                onTransformEnd: (evt: any) => {
                  evt.cancelBubble = true;
                  commitTransformFromNode(el.id, evt.target);
                },
              };

              return (
                <Group key={el.id} {...groupProps}>
                  <Rect
                    width={w}
                    height={h}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    cornerRadius={isBooth ? 6 : 8}
                  />
                  {displayText ? (
                    <Text
                      text={displayText}
                      width={w}
                      height={h}
                      align="center"
                      verticalAlign="middle"
                      fontStyle="bold"
                      fontSize={14}
                      fill="#0F172A"
                    />
                  ) : null}
                </Group>
              );
            }

            // ========= LINE =========
            if (el.type === "LINE") {
              const pts = Array.isArray((el as any).points)
                ? (el as any).points
                : [];

              return (
                <Line
                  key={el.id}
                  id={el.id}
                  name="selectable"
                  points={pts}
                  stroke={isSelected ? "#0EA5E9" : s.stroke}
                  strokeWidth={safeNumber(s.strokeWidth, 3)}
                  opacity={safeNumber(s.opacity, 1)}
                  onClick={(evt: any) => {
                    evt.cancelBubble = true;
                    const additive = evt.evt.shiftKey === true;
                    if (additive) {
                      onSelectIds(
                        isSelected
                          ? selectedIds.filter((v) => v !== el.id)
                          : [...selectedIds, el.id],
                      );
                    } else {
                      onSelectIds([el.id]);
                    }
                  }}
                  onTap={(evt: any) => {
                    evt.cancelBubble = true;
                    onSelectIds([el.id]);
                  }}
                />
              );
            }

            // ========= TEXT =========
            if (el.type === "TEXT") {
              // ✅ prioridade: props do elemento; fallback: alguns adapters antigos jogam isso em style
              const boxed = Boolean((el as any).boxed ?? (el as any).style?.boxed);
              const padding = safeNumber(
                (el as any).padding ?? (el as any).style?.padding,
                8,
              );
              const borderRadius = safeNumber(
                (el as any).borderRadius ?? (el as any).style?.borderRadius,
                10,
              );

              const textValue = String((el as any).text ?? (el as any).label ?? "");
              const fontSize = safeNumber(
                (el as any).fontSize ?? (el as any).style?.fontSize,
                18,
              );

              const approxWidth =
                Math.max(60, textValue.length * (fontSize * 0.62)) +
                padding * 2;
              const approxHeight = fontSize + padding * 2;

              const groupProps: any = {
                id: el.id,
                name: "selectable",
                x: safeNumber(el.x, 0),
                y: safeNumber(el.y, 0),
                rotation: safeNumber(el.rotation, 0),
                opacity: safeNumber(s.opacity, 1),
                draggable: canEditNode && isSelected,

                onClick: (evt: any) => {
                  evt.cancelBubble = true;
                  const additive = evt.evt.shiftKey === true;
                  if (additive) {
                    onSelectIds(
                      isSelected
                        ? selectedIds.filter((v) => v !== el.id)
                        : [...selectedIds, el.id],
                    );
                  } else {
                    onSelectIds([el.id]);
                  }
                },
                onTap: (evt: any) => {
                  evt.cancelBubble = true;
                  onSelectIds([el.id]);
                },

                onDragStart: (evt: any) => {
                  evt.cancelBubble = true;
                  isNodeDraggingRef.current = true;
                  setIsNodeDragging(true);
                },
                onDragEnd: (evt: any) => {
                  evt.cancelBubble = true;
                  isNodeDraggingRef.current = false;
                  setIsNodeDragging(false);
                },

                onTransformEnd: (evt: any) => {
                  evt.cancelBubble = true;
                  commitTransformFromNode(el.id, evt.target);
                },
              };

              return (
                <Group key={el.id} {...groupProps}>
                  {boxed ? (
                    <Rect
                      x={0}
                      y={0}
                      width={approxWidth}
                      height={approxHeight}
                      fill="white"
                      opacity={0.85}
                      stroke={isSelected ? "#0EA5E9" : s.stroke}
                      strokeWidth={isSelected ? 2 : safeNumber(s.strokeWidth, 2)}
                      cornerRadius={borderRadius}
                    />
                  ) : null}

                  <Text
                    x={boxed ? padding : 0}
                    y={boxed ? padding : 0}
                    text={textValue}
                    fontSize={fontSize}
                    fill={s.fill}
                    align={boxed ? "center" : "left"}
                    width={boxed ? approxWidth - padding * 2 : undefined}
                  />
                </Group>
              );
            }

            // ========= CIRCLE =========
            if (el.type === "CIRCLE") {
              const x = safeNumber(el.x, 0);
              const y = safeNumber(el.y, 0);
              const rotation = safeNumber(el.rotation, 0);
              const radius = Math.max(10, safeNumber((el as any).radius, 45));

              return (
                <Circle
                  key={el.id}
                  id={el.id}
                  name="selectable"
                  x={x}
                  y={y}
                  rotation={rotation}
                  opacity={safeNumber(s.opacity, 1)}
                  radius={radius}
                  fill={s.fill}
                  stroke={isSelected ? "#0EA5E9" : s.stroke}
                  strokeWidth={isSelected ? 2 : safeNumber(s.strokeWidth, 2)}
                  draggable={canEditNode && isSelected}
                  onClick={(evt: any) => {
                    evt.cancelBubble = true;
                    const additive = evt.evt.shiftKey === true;
                    if (additive) {
                      onSelectIds(
                        isSelected
                          ? selectedIds.filter((v) => v !== el.id)
                          : [...selectedIds, el.id],
                      );
                    } else {
                      onSelectIds([el.id]);
                    }
                  }}
                  onTap={(evt: any) => {
                    evt.cancelBubble = true;
                    onSelectIds([el.id]);
                  }}
                  onDragStart={(evt: any) => {
                    evt.cancelBubble = true;
                    isNodeDraggingRef.current = true;
                    setIsNodeDragging(true);
                  }}
                  onDragEnd={(evt: any) => {
                    evt.cancelBubble = true;
                    isNodeDraggingRef.current = false;
                    setIsNodeDragging(false);
                  }}
                  onTransformEnd={(evt: any) => {
                    evt.cancelBubble = true;
                    commitTransformFromNode(el.id, evt.target);
                  }}
                />
              );
            }

            // ========= TREE (default) =========
            const x = safeNumber(el.x, 0);
            const y = safeNumber(el.y, 0);
            const rotation = safeNumber(el.rotation, 0);
            const radius = Math.max(6, safeNumber((el as any).radius, 14));

            const groupProps: any = {
              id: el.id,
              name: "selectable",
              x,
              y,
              rotation,
              opacity: safeNumber(s.opacity, 1),
              draggable: canEditNode && isSelected,

              onClick: (evt: any) => {
                evt.cancelBubble = true;
                const additive = evt.evt.shiftKey === true;
                if (additive) {
                  onSelectIds(
                    isSelected
                      ? selectedIds.filter((v) => v !== el.id)
                      : [...selectedIds, el.id],
                  );
                } else {
                  onSelectIds([el.id]);
                }
              },
              onTap: (evt: any) => {
                evt.cancelBubble = true;
                onSelectIds([el.id]);
              },

              onDragStart: (evt: any) => {
                evt.cancelBubble = true;
                isNodeDraggingRef.current = true;
                setIsNodeDragging(true);
              },
              onDragEnd: (evt: any) => {
                evt.cancelBubble = true;
                isNodeDraggingRef.current = false;
                setIsNodeDragging(false);
              },

              onTransformEnd: (evt: any) => {
                evt.cancelBubble = true;
                commitTransformFromNode(el.id, evt.target);
              },
            };

            return (
              <Group key={el.id} {...groupProps}>
                <Circle
                  radius={radius}
                  fill={s.fill}
                  stroke={isSelected ? "#0EA5E9" : s.stroke}
                  strokeWidth={isSelected ? 2 : safeNumber(s.strokeWidth, 2)}
                />
                <Text
                  text={"🌳"}
                  x={-radius}
                  y={-radius}
                  width={radius * 2}
                  height={radius * 2}
                  align="center"
                  verticalAlign="middle"
                  fontSize={radius}
                />
              </Group>
            );
          })}

          {/* Ghost line */}
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

          {/* Marquee selection */}
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

          {/* Transformer */}
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