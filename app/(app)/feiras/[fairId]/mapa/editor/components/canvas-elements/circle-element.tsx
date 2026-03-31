"use client";

/**
 * CircleCanvasElement
 *
 * Renderiza elemento CIRCLE no canvas Konva.
 */

import { Circle } from "react-konva";
import { safeNumber, safeStyle } from "../map-utils";
import type { CanvasElementProps } from "./shared-element-props";

export function CircleCanvasElement({
  element: el,
  isSelected,
  canEditNode,
  selectedIds,
  onSelectIds,
  commitPositionFromNode,
  commitTransformFromNode,
  ...rest
}: CanvasElementProps & {
  setIsNodeDragging: (v: boolean) => void;
  isNodeDraggingRef: React.MutableRefObject<boolean>;
}) {
  const args = rest as any;
  const setIsNodeDragging = args.setIsNodeDragging;
  const isNodeDraggingRef = args.isNodeDraggingRef;

  const s = safeStyle((el as any).style);
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
      onDragMove={(evt: any) => {
        evt.cancelBubble = true;
        commitPositionFromNode(el.id, evt.target);
      }}
      onDragEnd={(evt: any) => {
        evt.cancelBubble = true;
        commitPositionFromNode(el.id, evt.target);
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
