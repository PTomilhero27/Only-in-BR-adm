"use client";

/**
 * LineElement
 *
 * Renderiza elemento LINE no canvas Konva.
 */

import { Line } from "react-konva";
import { safeNumber, safeStyle } from "../map-utils";
import type { CanvasElementProps } from "./shared-element-props";

export function LineElement({
  element: el,
  isSelected,
  selectedIds,
  onSelectIds,
}: CanvasElementProps) {
  const s = safeStyle((el as any).style);
  const pts = Array.isArray((el as any).points) ? (el as any).points : [];

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
