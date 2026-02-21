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

  linkedBoothIds?: Set<string>;

  enableOperationalBoothClick?: boolean;
  onBoothClick?: (boothId: string) => void;

  viewportToken?: number;

  /**
   * ✅ Desenho de linha “click and click”
   * - o estado fica no MapaClient, para hotkeys (Esc/Enter/Backspace) funcionarem global
   */
  lineDraft?: LineDraft;
  onLineDraftChange?: (next: LineDraft) => void;
  onFinishLineDraft?: () => void;
};

function clampScale(next: number) {
  return Math.min(3, Math.max(0.35, next));
}

function haveIntersection(a: { x: number; y: number; width: number; height: number }, b: any) {
  return !(
    b.x > a.x + a.width ||
    b.x + b.width < a.x ||
    b.y > a.y + a.height ||
    b.y + b.height < a.y
  );
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
    const newScale = clampScale(direction > 0 ? oldScale * scaleBy : oldScale / scaleBy);

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

  // fit inicial do background (e re-fit quando viewportToken muda)
  const didInitRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!bgImage || !backgroundUrl) return;

    if (didInitRef.current === backgroundUrl && viewportToken == null) return;

    const imgW = bgImage.width || 1;
    const imgH = bgImage.height || 1;

    const fit = clampScale(Math.min(stageSize.width / imgW, stageSize.height / imgH));
    const x = (stageSize.width - imgW * fit) / 2;
    const y = (stageSize.height - imgH * fit) / 2;

    setScale(fit);
    setPosition({ x, y });

    didInitRef.current = backgroundUrl;
  }, [bgImage, backgroundUrl, stageSize.width, stageSize.height, viewportToken]);

  const stageDraggable = tool === "SELECT";

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
    selectionStartRef.current = screenPt;
    setSelectionRect({ visible: true, x: screenPt.x, y: screenPt.y, width: 0, height: 0 });
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

    onSelectIds(additive ? Array.from(new Set([...selectedIds, ...selected])) : selected);
  }

  function commitTransformFromNode(id: string, node: any) {
    const rotation = node.rotation();
    const x = node.x();
    const y = node.y();

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;

        if (el.type === "RECT") {
          const width = Math.max(10, (el as any).width * scaleX);
          const height = Math.max(10, (el as any).height * scaleY);
          return { ...(el as any), x, y, rotation, width, height };
        }

        if (el.type === "TEXT") {
          return { ...(el as any), x, y, rotation };
        }

        if (el.type === "TREE") {
          const radius = Math.max(6, (el as any).radius * Math.max(scaleX, scaleY));
          return { ...(el as any), x, y, rotation, radius };
        }

        return { ...(el as any), x, y, rotation };
      }),
    );
  }

  /**
   * ✅ Atualiza o preview da linha (ghost) conforme o mouse se move.
   */
  function updateLinePreviewFromPointer() {
    const stage = stageRef.current;
    if (!stage) return;
    if (!lineDraft?.active) return;
    const p = stage.getPointerPosition();
    if (!p) return;
    const world = toWorldPoint(p);
    onLineDraftChange?.({ ...lineDraft, preview: world });
  }

  /**
   * ✅ Clique para adicionar ponto na linha
   * Regras:
   * - Primeiro clique inicia draft
   * - Próximos cliques adicionam segmentos
   */
  function addLinePointFromPointer() {
    const stage = stageRef.current;
    if (!stage) return;
    const p = stage.getPointerPosition();
    if (!p) return;
    const world = toWorldPoint(p);

    // inicia
    if (!lineDraft?.active) {
      onLineDraftChange?.({
        active: true,
        points: [Math.round(world.x), Math.round(world.y)],
        preview: world,
      });
      return;
    }

    // adiciona ponto
    onLineDraftChange?.({
      ...lineDraft,
      points: [...lineDraft.points, Math.round(world.x), Math.round(world.y)],
      preview: world,
    });
  }

  const ghostPoints = React.useMemo(() => {
    if (!lineDraft?.active) return null;
    if (!lineDraft.preview) return lineDraft.points;
    return [...lineDraft.points, Math.round(lineDraft.preview.x), Math.round(lineDraft.preview.y)];
  }, [lineDraft]);

  return (
    <div ref={containerRef} className="h-full w-full">
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
        onDragEnd={(e) => setPosition({ x: e.target.x(), y: e.target.y() })}
        onMouseMove={() => {
          // ✅ ghost line segue o mouse
          updateLinePreviewFromPointer();

          // marquee selection
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

          // ✅ LINE click-and-click
          if (isEditMode && tool === "LINE" && isMapAreaTarget(target)) {
            addLinePointFromPointer();
            return;
          }

          // criar elemento quando tool != SELECT (exceto LINE)
          if (isEditMode && tool !== "SELECT" && tool !== "LINE" && isMapAreaTarget(target)) {
            const p = stage.getPointerPosition();
            if (!p) return;
            const world = toWorldPoint(p);
            onCreateAtPoint?.(world);
            return;
          }

          // clique vazio inicia marquee
          if (isEditMode && tool === "SELECT" && isMapAreaTarget(target)) {
            const p = stage.getPointerPosition();
            if (!p) return;

            const additive = e.evt.shiftKey === true;
            if (!additive) onSelectIds([]);

            beginSelection(p);
          }

          // modo operacional: clicar no vazio limpa seleção
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
          // ✅ Double click finaliza linha (equivalente ao Enter)
          if (isEditMode && tool === "LINE" && lineDraft?.active) {
            onFinishLineDraft?.();
          }
        }}
        onTouchStart={(e) => {
          const stage = stageRef.current;
          if (!stage) return;

          const target = e.target;

          if (isEditMode && tool === "LINE" && isMapAreaTarget(target)) {
            addLinePointFromPointer();
            return;
          }

          if (isEditMode && tool !== "SELECT" && tool !== "LINE" && isMapAreaTarget(target)) {
            const p = stage.getPointerPosition();
            if (!p) return;
            const world = toWorldPoint(p);
            onCreateAtPoint?.(world);
            return;
          }

          if (isEditMode && tool === "SELECT" && isMapAreaTarget(target)) {
            const p = stage.getPointerPosition();
            if (!p) return;
            onSelectIds([]);
            beginSelection(p);
          }
        }}
        onTouchMove={() => {
          updateLinePreviewFromPointer();

          const stage = stageRef.current;
          if (!stage) return;
          if (!isSelectingRef.current) return;

          const p = stage.getPointerPosition();
          if (!p) return;
          updateSelection(p);
        }}
        onTouchEnd={() => {
          if (!isSelectingRef.current) return;
          endSelection(false);
        }}
      >
        <Layer>
          {bgImage ? <KonvaImage image={bgImage} x={0} y={0} /> : null}

          {elements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const canEditNode = isEditMode && tool === "SELECT" && selectedIds.length > 0;

            if (el.type === "RECT") {
              const rectKind = (el as any).rectKind;
              const isBooth = rectKind === "BOOTH";

              const isLinked = isBooth ? !!linkedBoothIds?.has(el.id) : false;

              const displayText = isBooth
                ? typeof (el as any).number === "number"
                  ? String((el as any).number)
                  : ""
                : (el as any).label?.trim()
                  ? (el as any).label
                  : "";

              const groupProps: any = {
                id: el.id,
                name: "selectable",
                x: (el as any).x,
                y: (el as any).y,
                rotation: (el as any).rotation,
                opacity: (el as any).style.opacity,
                draggable: canEditNode && isSelected,
                onClick: (evt: any) => {
                  const additive = evt.evt.shiftKey === true;

                  if (additive) {
                    onSelectIds(isSelected ? selectedIds.filter((x) => x !== el.id) : [...selectedIds, el.id]);
                  } else {
                    onSelectIds([el.id]);
                  }

                  if (!isEditMode && enableOperationalBoothClick && isBooth) {
                    onBoothClick?.(el.id);
                  }
                },
                onTap: () => {
                  onSelectIds([el.id]);
                  if (!isEditMode && enableOperationalBoothClick && isBooth) {
                    onBoothClick?.(el.id);
                  }
                },

                onDragStart: (evt: any) => {
                  if (!canEditNode || !isSelected) return;

                  dragStartRef.current = {
                    ids: [...selectedIds],
                    start: Object.fromEntries(
                      selectedIds.map((id) => {
                        const found = elements.find((e) => e.id === id);
                        return [id, found ? { x: (found as any).x, y: (found as any).y } : { x: 0, y: 0 }];
                      }),
                    ),
                    anchorId: el.id,
                  };
                },

                onDragMove: (evt: any) => {
                  const ctx = dragStartRef.current;
                  if (!ctx || !ctx.anchorId) return;
                  if (ctx.anchorId !== el.id) return;

                  const anchorStart = ctx.start[ctx.anchorId];
                  const dx = evt.target.x() - anchorStart.x;
                  const dy = evt.target.y() - anchorStart.y;

                  setElements((prev) =>
                    prev.map((item) => {
                      if (!ctx.ids.includes(item.id)) return item;
                      const s = ctx.start[item.id] ?? { x: (item as any).x, y: (item as any).y };
                      return { ...(item as any), x: s.x + dx, y: s.y + dy } as any;
                    }),
                  );
                },

                onDragEnd: () => {
                  dragStartRef.current = null;
                },

                onTransformEnd: (evt: any) => {
                  commitTransformFromNode(el.id, evt.target);
                },
              };

              const boothFill = isLinked ? "#BBF7D0" : "#FEF9C3";
              const boothStroke = isLinked ? "#16A34A" : "#CA8A04";

              return (
                <Group key={el.id} {...groupProps}>
                  <Rect
                    width={(el as any).width}
                    height={(el as any).height}
                    fill={isBooth ? boothFill : (el as any).style.fill}
                    stroke={isSelected ? "#0EA5E9" : isBooth ? boothStroke : (el as any).style.stroke}
                    strokeWidth={isSelected ? Math.max(2, (el as any).style.strokeWidth) : (el as any).style.strokeWidth}
                    cornerRadius={isBooth ? 16 : 8}
                  />
                  <Text
                    text={displayText}
                    width={(el as any).width}
                    height={(el as any).height}
                    align="center"
                    verticalAlign="middle"
                    fontStyle="bold"
                    fontSize={14}
                    fill="#0F172A"
                  />
                </Group>
              );
            }

            if (el.type === "LINE") {
              return (
                <Line
                  key={el.id}
                  id={el.id}
                  name="selectable"
                  points={(el as any).points}
                  stroke={isSelected ? "#0EA5E9" : (el as any).style.stroke}
                  strokeWidth={(el as any).style.strokeWidth}
                  opacity={(el as any).style.opacity}
                  onClick={(evt: any) => {
                    const additive = evt.evt.shiftKey === true;
                    if (additive) {
                      onSelectIds(isSelected ? selectedIds.filter((x) => x !== el.id) : [...selectedIds, el.id]);
                    } else {
                      onSelectIds([el.id]);
                    }
                  }}
                  onTap={() => onSelectIds([el.id])}
                />
              );
            }

            if (el.type === "TEXT") {
              const boxed = !!(el as any).boxed;
              const padding = (el as any).padding ?? 8;
              const radius = (el as any).borderRadius ?? 10;

              const approxWidth = Math.max(60, (el as any).text.length * ((el as any).fontSize * 0.62)) + padding * 2;
              const approxHeight = (el as any).fontSize + padding * 2;

              const groupProps: any = {
                id: el.id,
                name: "selectable",
                x: (el as any).x,
                y: (el as any).y,
                rotation: (el as any).rotation,
                opacity: (el as any).style.opacity,
                draggable: canEditNode && isSelected,
                onClick: (evt: any) => {
                  const additive = evt.evt.shiftKey === true;
                  if (additive) {
                    onSelectIds(isSelected ? selectedIds.filter((x) => x !== el.id) : [...selectedIds, el.id]);
                  } else {
                    onSelectIds([el.id]);
                  }
                },
                onTap: () => onSelectIds([el.id]),
                onTransformEnd: (evt: any) => commitTransformFromNode(el.id, evt.target),
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
                      stroke={isSelected ? "#0EA5E9" : (el as any).style.stroke}
                      strokeWidth={isSelected ? 2 : (el as any).style.strokeWidth}
                      cornerRadius={radius}
                    />
                  ) : null}

                  <Text
                    x={boxed ? padding : 0}
                    y={boxed ? padding : 0}
                    text={(el as any).text}
                    fontSize={(el as any).fontSize}
                    fill={(el as any).style.fill}
                    align={boxed ? "center" : "left"}
                    width={boxed ? approxWidth - padding * 2 : undefined}
                  />
                </Group>
              );
            }

            // TREE
            const groupProps: any = {
              id: el.id,
              name: "selectable",
              x: (el as any).x,
              y: (el as any).y,
              rotation: (el as any).rotation,
              opacity: (el as any).style.opacity,
              draggable: canEditNode && isSelected,
              onClick: (evt: any) => {
                const additive = evt.evt.shiftKey === true;
                if (additive) {
                  onSelectIds(isSelected ? selectedIds.filter((x) => x !== el.id) : [...selectedIds, el.id]);
                } else {
                  onSelectIds([el.id]);
                }
              },
              onTap: () => onSelectIds([el.id]),
              onTransformEnd: (evt: any) => commitTransformFromNode(el.id, evt.target),
            };

            return (
              <Group key={el.id} {...groupProps}>
                <Circle
                  radius={(el as any).radius}
                  fill={(el as any).style.fill}
                  stroke={isSelected ? "#0EA5E9" : (el as any).style.stroke}
                  strokeWidth={isSelected ? 2 : (el as any).style.strokeWidth}
                />
                <Text
                  text={"🌳"}
                  x={-(el as any).radius}
                  y={-(el as any).radius}
                  width={(el as any).radius * 2}
                  height={(el as any).radius * 2}
                  align="center"
                  verticalAlign="middle"
                  fontSize={(el as any).radius}
                />
              </Group>
            );
          })}

          {/* ✅ Ghost line */}
          {isEditMode && tool === "LINE" && lineDraft?.active && ghostPoints && ghostPoints.length >= 2 ? (
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
                const stage = stageRef.current;
                const tr = trRef.current;
                if (!stage || !tr) return;

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