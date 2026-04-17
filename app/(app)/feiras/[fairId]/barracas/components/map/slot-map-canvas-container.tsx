"use client"

import * as React from "react"

import { FairMap2DCanvas } from "../../../mapa/editor/components/fair-map-2d-canvas"
import type { MapElement, MapTool } from "../../../mapa/types/types"

type MapCanvasContainerProps = {
  backgroundUrl?: string
  elements: MapElement[]
  setElements: React.Dispatch<React.SetStateAction<MapElement[]>>
  tool: MapTool
  selectedIds: string[]
  onSelectIds: (ids: string[]) => void
  onCreateAtPoint: (pt: { x: number; y: number }) => void
  linkedBoothIds: Set<string>
  slotStatusMap: Map<string, { commercialStatus: string; priceCents: number }>
  addingBooth: boolean
}

export const SlotMapCanvasContainer = React.memo(
  function SlotMapCanvasContainer({
    backgroundUrl,
    elements,
    setElements,
    tool,
    selectedIds,
    onSelectIds,
    onCreateAtPoint,
    linkedBoothIds,
    slotStatusMap,
    addingBooth,
  }: MapCanvasContainerProps) {
    return (
      <div className="relative h-full min-h-0 overflow-hidden rounded-xl border bg-background">
        <FairMap2DCanvas
          backgroundUrl={backgroundUrl}
          elements={elements}
          setElements={setElements}
          isEditMode={false}
          tool={tool}
          selectedIds={selectedIds}
          onSelectIds={onSelectIds}
          onCreateAtPoint={onCreateAtPoint}
          linkedBoothIds={linkedBoothIds}
          slotStatusMap={slotStatusMap}
          enableOperationalBoothClick={!addingBooth}
          onBoothClick={(id) => onSelectIds([id])}
        />
      </div>
    )
  },
  (prev, next) =>
    prev.backgroundUrl === next.backgroundUrl &&
    prev.elements === next.elements &&
    prev.setElements === next.setElements &&
    prev.tool === next.tool &&
    prev.selectedIds === next.selectedIds &&
    prev.onSelectIds === next.onSelectIds &&
    prev.onCreateAtPoint === next.onCreateAtPoint &&
    prev.addingBooth === next.addingBooth &&
    prev.linkedBoothIds === next.linkedBoothIds &&
    prev.slotStatusMap === next.slotStatusMap,
)
