"use client";

/**
 * RectLikeElement
 *
 * Renderiza RECT, SQUARE e BOOTH_SLOT no canvas Konva.
 * Combinados num só componente porque a lógica de render é quase idêntica.
 *
 * ✅ Atualizado com cores por status comercial do Marketplace.
 */

import { Group, Rect, Text } from "react-konva";
import { safeNumber, safeStyle } from "../map-utils";
import type { CanvasElementProps } from "./shared-element-props";

/**
 * Mapa de cores por status comercial.
 */
const COMMERCIAL_STATUS_COLORS: Record<
  string,
  { fill: string; stroke: string }
> = {
  AVAILABLE: { fill: "#FEF9C3", stroke: "#CA8A04" },
  RESERVED: { fill: "#DBEAFE", stroke: "#2563EB" },
  CONFIRMED: { fill: "#BBF7D0", stroke: "#16A34A" },
  BLOCKED: { fill: "#FEE2E2", stroke: "#DC2626" },
};

const DEFAULT_BOOTH_COLORS = { fill: "#FEF9C3", stroke: "#CA8A04" };

export function RectLikeElement({
  element: el,
  isSelected,
  canEditNode,
  linkedBoothIds,
  enableOperationalBoothClick,
  selectedIds,
  onSelectIds,
  onBoothClick,
  isEditMode,
  commitPositionFromNode,
  commitTransformFromNode,
  ...rest
}: CanvasElementProps & {
  setIsNodeDragging: (v: boolean) => void;
  isNodeDraggingRef: React.MutableRefObject<boolean>;
  /** Mapa clientKey → commercialStatus para colorir booths */
  slotStatusMap?: Map<string, { commercialStatus: string; priceCents: number }>;
}) {
  const args = rest as any;
  const setIsNodeDragging = args.setIsNodeDragging;
  const isNodeDraggingRef = args.isNodeDraggingRef;
  const slotStatusMap: Map<string, { commercialStatus: string; priceCents: number }> | undefined =
    args.slotStatusMap;

  const s = safeStyle((el as any).style);

  const x = safeNumber(el.x, 0);
  const y = safeNumber(el.y, 0);
  const rotation = safeNumber(el.rotation, 0);
  const w = Math.max(10, safeNumber((el as any).width, 60));
  const h = Math.max(10, safeNumber((el as any).height, 60));

  const isBooth = el.type === "BOOTH_SLOT";

  const linkKey = (el as any).clientKey ?? el.id;

  // Resolve status comercial do slot
  const slotInfo = isBooth ? slotStatusMap?.get(linkKey) ?? slotStatusMap?.get(el.id) : undefined;
  const commercialStatus = slotInfo?.commercialStatus;

  // Cores baseadas no status comercial
  const statusColors = commercialStatus
    ? COMMERCIAL_STATUS_COLORS[commercialStatus] ?? DEFAULT_BOOTH_COLORS
    : DEFAULT_BOOTH_COLORS;

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

  const boothBaseStrokeWidth =
    typeof (el as any)?.style?.strokeWidth === "number"
      ? (el as any).style.strokeWidth
      : 2;

  const nodeOpacity = isBooth
    ? safeNumber((el as any)?.style?.opacity, 0.85)
    : safeNumber(s.opacity, 1);

  // Cor de preenchimento: se tem status comercial, usa cores do marketplace
  // Caso contrário, mantém comportamento anterior (linked = verde)
  const fill = isBooth
    ? commercialStatus
      ? statusColors.fill
      : isLinked
        ? "#BBF7D0"
        : DEFAULT_BOOTH_COLORS.fill
    : s.fill;

  const stroke = isSelected
    ? "#0EA5E9"
    : isBooth
      ? commercialStatus
        ? statusColors.stroke
        : isLinked
          ? "#16A34A"
          : DEFAULT_BOOTH_COLORS.stroke
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

    onDragMove: (evt: any) => {
      evt.cancelBubble = true;
      commitPositionFromNode(el.id, evt.target);
    },

    onDragEnd: (evt: any) => {
      evt.cancelBubble = true;
      commitPositionFromNode(el.id, evt.target);
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
