"use client";

/**
 * TextCanvasElement
 *
 * Renderiza elemento TEXT no canvas Konva.
 */

import { Group, Rect, Text } from "react-konva";
import { safeNumber, safeStyle } from "../map-utils";
import type { CanvasElementProps } from "./shared-element-props";

export function TextCanvasElement({
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
