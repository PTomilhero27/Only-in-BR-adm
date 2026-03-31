/**
 * shared-element-props.ts
 *
 * Tipagem e factories de event handlers compartilhados
 * por todos os sub-componentes de renderização Konva.
 */

import type { MapElement, MapTool } from "../../../types/types";

export type CanvasElementProps = {
  element: MapElement;
  isSelected: boolean;
  canEditNode: boolean;
  linkedBoothIds?: Set<string>;
  enableOperationalBoothClick?: boolean;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onBoothClick?: (id: string) => void;
  isEditMode: boolean;
  commitPositionFromNode: (id: string, node: any) => void;
  commitTransformFromNode: (id: string, node: any) => void;
};

/**
 * Gera os handlers comuns de click, tap, drag e transform
 * para qualquer elemento Konva renderizado no mapa.
 */
export function buildCommonNodeHandlers(props: {
  elementId: string;
  isSelected: boolean;
  canEditNode: boolean;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  isEditMode: boolean;
  commitPositionFromNode: (id: string, node: any) => void;
  commitTransformFromNode: (id: string, node: any) => void;
  setIsNodeDragging: (v: boolean) => void;
  isNodeDraggingRef: React.MutableRefObject<boolean>;
  /** Extra callback after onClick/onTap (e.g. booth operational click) */
  onExtraClick?: () => void;
}) {
  const {
    elementId,
    isSelected,
    canEditNode,
    selectedIds,
    onSelectIds,
    commitPositionFromNode,
    commitTransformFromNode,
    setIsNodeDragging,
    isNodeDraggingRef,
    onExtraClick,
  } = props;

  return {
    id: elementId,
    name: "selectable",
    draggable: canEditNode && isSelected,

    onClick: (evt: any) => {
      evt.cancelBubble = true;
      const additive = evt.evt.shiftKey === true;

      if (additive) {
        onSelectIds(
          isSelected
            ? selectedIds.filter((v) => v !== elementId)
            : [...selectedIds, elementId],
        );
      } else {
        onSelectIds([elementId]);
      }

      onExtraClick?.();
    },

    onTap: (evt: any) => {
      evt.cancelBubble = true;
      onSelectIds([elementId]);
      onExtraClick?.();
    },

    onDragStart: (evt: any) => {
      evt.cancelBubble = true;
      isNodeDraggingRef.current = true;
      setIsNodeDragging(true);
    },

    onDragMove: (evt: any) => {
      evt.cancelBubble = true;
      commitPositionFromNode(elementId, evt.target);
    },

    onDragEnd: (evt: any) => {
      evt.cancelBubble = true;
      commitPositionFromNode(elementId, evt.target);
      isNodeDraggingRef.current = false;
      setIsNodeDragging(false);
    },

    onTransformEnd: (evt: any) => {
      evt.cancelBubble = true;
      commitTransformFromNode(elementId, evt.target);
    },
  };
}
