"use client";

/**
 * TreeCanvasElement
 *
 * Renderiza elemento TREE no canvas Konva.
 */

import { Group, Circle, Text } from "react-konva";
import { safeNumber, safeStyle } from "../map-utils";
import type { CanvasElementProps } from "./shared-element-props";

export function TreeCanvasElement({
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
      <Circle
        radius={radius}
        fill={s.fill}
        stroke={isSelected ? "#0EA5E9" : s.stroke}
        strokeWidth={isSelected ? 2 : safeNumber(s.strokeWidth, 2)}
      />
      <Text
        text="🌳"
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
}
