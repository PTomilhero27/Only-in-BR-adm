"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import { Maximize2, Minimize2, X, Link as LinkIcon, Info, Map as MapIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

import { MapElement, MapTool } from "../../../mapa/types/types"
import { useGlobalFair } from "../../../components/global-fair-provider"
import { useFairMapQuery, useLinkBoothSlotMutation } from "@/app/modules/fair-maps/fair-maps.queries"
import { useCreateMagicLinkMutation } from "@/app/modules/fair-maps/magic-link.queries"
import { useUpdateSlotStatusMutation, useBlockSlotMutation, useUnblockSlotMutation } from "@/app/modules/marketplace/marketplace.queries"
import { MarketplaceSlotStatus } from "@/app/modules/marketplace/marketplace.schema"
import { adaptTemplateElementToCanvasElement } from "../../../mapa/editor/components/map-serialization"
import { SlotMapSidebar } from "./slot-map-sidebar"
import { SlotMapCanvasContainer } from "./slot-map-canvas-container"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  fairId: string
  exhibitorName: string
  slotNumber: number | null
  slotClientKey: string | null
}

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ")
}

const EMPTY_ARRAY: any[] = []

export function SlotMapDialog({
  open,
  onOpenChange,
  fairId,
  exhibitorName,
  slotNumber: slotNumberFromProps,
  slotClientKey: slotClientKeyFromProps,
}: Props) {
  const { isFinalizada } = useGlobalFair()
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [addingBooth, setAddingBooth] = React.useState(false)
  const [elements, setElements] = React.useState<MapElement[]>([])
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  
  const fairMap = useFairMapQuery(fairId)
  const tool: MapTool = addingBooth ? "BOOTH" : "SELECT"
  const backgroundUrl = (fairMap.data as any)?.template?.backgroundUrl ?? undefined

  const updateStatus = useUpdateSlotStatusMutation(fairId)
  const blockSlot = useBlockSlotMutation(fairId)
  const unblockSlot = useUnblockSlotMutation(fairId)
  const linkMutation = useLinkBoothSlotMutation(fairId)
  const createLinkMutation = useCreateMagicLinkMutation(fairId)

  // Memoized initial elements to avoid re-renders
  const initialElements = React.useMemo<MapElement[]>(() => {
    const raw = (fairMap.data?.template?.elements as any[]) ?? EMPTY_ARRAY
    return raw.map((el) => adaptTemplateElementToCanvasElement(el))
  }, [fairMap.data?.template?.elements])

  // Sync elements on open
  React.useEffect(() => {
    if (open) {
      setElements(initialElements)
      setSelectedIds([])
    }
  }, [initialElements, open])

  // Initial selection logic
  React.useEffect(() => {
    if (!open || !initialElements.length) return
    if (slotClientKeyFromProps) {
      const exists = initialElements.some((e) => e.id === slotClientKeyFromProps)
      if (exists) { setSelectedIds([slotClientKeyFromProps]); return }
    }
    if (typeof slotNumberFromProps === "number") {
      const found = initialElements.find((e) => e.type === "BOOTH_SLOT" && (e as any).number === slotNumberFromProps)
      if (found) setSelectedIds([found.id])
    }
  }, [open, initialElements, slotClientKeyFromProps, slotNumberFromProps])

  const slots = (fairMap.data as any)?.slots ?? EMPTY_ARRAY
  const slotStatusMap = React.useMemo(() => {
    const map = new Map<string, { commercialStatus: string; priceCents: number }>()
    for (const s of slots) {
      if (s?.fairMapElementId) map.set(String(s.fairMapElementId), { commercialStatus: s.commercialStatus ?? "AVAILABLE", priceCents: s.priceCents ?? 0 })
    }
    return map
  }, [slots])

  const selectedSlotData = React.useMemo(() => {
    if (!selectedIds[0]) return null
    return slots.find((s: any) => s.fairMapElementId === selectedIds[0]) ?? null
  }, [selectedIds, slots])

  const selected = React.useMemo(() => {
    if (selectedIds.length !== 1) return null
    return elements.find((e) => e.id === selectedIds[0]) ?? null
  }, [elements, selectedIds])

  const slotClientKey = (selected?.type === "BOOTH_SLOT" ? selected!.id : null)
  const slotNumber = (selected?.type === "BOOTH_SLOT" ? (selected as any).number ?? null : null)
  
  const linked = React.useMemo(() => {
    if (!slotClientKey) return null
    return (fairMap.data?.links as any[])?.find(l => String(l.slotClientKey) === slotClientKey) ?? null
  }, [slotClientKey, fairMap.data?.links])

  const linkedBoothIds = React.useMemo(() => {
    const ids = (fairMap.data?.links ?? []).map((l: any) => String(l.slotClientKey))
    return new Set(ids)
  }, [fairMap.data?.links])

  // Handlers
  const handleStatusChange = async (nextStatus: MarketplaceSlotStatus) => {
    if (!selectedSlotData) return
    try {
      if (nextStatus === "BLOCKED") {
        await blockSlot.mutateAsync(selectedSlotData.id)
        toast.success({ title: "Slot bloqueado com sucesso" })
      } else if (selectedSlotData.commercialStatus === "BLOCKED" && nextStatus === "AVAILABLE") {
        await unblockSlot.mutateAsync(selectedSlotData.id)
        toast.success({ title: "Slot liberado com sucesso" })
      } else {
        await updateStatus.mutateAsync({ slotId: selectedSlotData.id, status: nextStatus })
        toast.success({ title: "Status atualizado" })
      }
    } catch (err) {
      toast.error({ title: "Erro na atualização", subtitle: (err as any)?.message })
    }
  }

  const handleLink = async (sfId: string) => {
    if (!slotClientKey) return
    try {
      await linkMutation.mutateAsync({ slotClientKey, input: { stallFairId: sfId } })
      toast.success({ title: "Barraca vinculada" })
    } catch (err) {
      toast.error({ title: "Erro no vínculo", subtitle: (err as any)?.message })
    }
  }

  const handleUnlink = async () => {
    if (!slotClientKey) return
    try {
      await linkMutation.mutateAsync({ slotClientKey, input: { stallFairId: null } })
      toast.success({ title: "Barraca desvinculada" })
    } catch (err) {
      toast.error({ title: "Erro ao desvincular", subtitle: (err as any)?.message })
    }
  }

  const handleGenerateLink = async () => {
    try {
      const result = await createLinkMutation.mutateAsync()
      const data = result.magicLink ?? (result as any)
      const url = data.url || `${window.location.origin}/mapa/${data.code}`
      navigator.clipboard.writeText(url)
      toast.success({ title: "Link Mágico Gerado", subtitle: "URL copiada para a área de transferência." })
    } catch (err) {
      toast.error({ title: "Erro ao gerar link", subtitle: (err as any)?.message })
    }
  }

  const close = () => { onOpenChange(false) }
  const dialogSizeClass = isFullscreen
    ? "top-0 left-0 right-0 bottom-0 !w-auto !max-w-none translate-x-0 translate-y-0 rounded-none"
    : "top-2 left-2 right-2 bottom-2 sm:top-4 sm:left-4 sm:right-4 sm:bottom-4 lg:top-6 lg:left-6 lg:right-6 lg:bottom-6 !w-auto !max-w-none translate-x-0 translate-y-0 rounded-[28px]"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className={cn(
        "flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl transition-all duration-300 bg-white/95 backdrop-blur-md",
        dialogSizeClass
      )}>
        {/* Header Premium */}
        <div className="flex items-center justify-between px-6 py-5 border-b bg-white/50">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm border border-orange-200">
                <MapIcon className="h-5 w-5" />
             </div>
             <div>
                <DialogTitle className="text-xl font-extrabold tracking-tight text-slate-900">Mapa de Alocação</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-100 uppercase font-bold py-0 h-4">Admin Mode</Badge>
                  <span className="text-xs text-slate-400">•</span>
                  <p className="text-xs text-slate-500">Expositor: <span className="font-semibold text-slate-700">{exhibitorName}</span></p>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="hidden md:flex gap-2 border-slate-200 hover:bg-slate-50 h-9 px-4 rounded-xl shadow-sm" onClick={handleGenerateLink}>
               <LinkIcon className="h-3.5 w-3.5" />
               <span className="text-xs font-bold">Link Mágico</span>
             </Button>

             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors" onClick={() => setIsFullscreen(!isFullscreen)}>
               {isFullscreen ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
             </Button>

             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors" onClick={close}>
               <X className="h-4.5 w-4.5" />
             </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px] overflow-hidden bg-slate-50/10">
          {/* Main Map Viewer */}
          <div className="flex flex-col min-h-0 p-2 lg:p-3 border-r border-slate-100 relative bg-muted/5 overflow-hidden">
             <SlotMapCanvasContainer 
                backgroundUrl={backgroundUrl}
                elements={elements}
                setElements={setElements}
                tool={tool}
                selectedIds={selectedIds}
                onSelectIds={setSelectedIds}
                onCreateAtPoint={() => {}}
                linkedBoothIds={linkedBoothIds}
                slotStatusMap={slotStatusMap}
                addingBooth={addingBooth}
             />
             
             {/* Map Help Hint */}
             <div className="absolute bottom-10 left-10 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur shadow-sm border border-slate-100 text-[10px] text-slate-500 font-medium">
                <Info className="h-3 w-3 text-sky-500" />
                Use o scroll para zoom e arraste para navegar.
             </div>
          </div>

          {/* Sidebar Design */}
          <div className="flex flex-col min-h-0 bg-white p-4 lg:p-6">
             {selectedSlotData ? (
               <SlotMapSidebar 
                  fairId={fairId}
                  open={open}
                  isFinalizada={isFinalizada}
                  selectedSlotData={selectedSlotData}
                  slotClientKey={slotClientKey}
                  slotNumber={slotNumber}
                  linked={linked}
                  onUnlink={handleUnlink}
                  onLink={handleLink}
                  onStatusChange={handleStatusChange}
                  onClearSelection={() => setSelectedIds([])}
                  fairMapData={fairMap.data}
               />
             ) : (
               <MapLegend
                 slotStatusMap={slotStatusMap}
                 totalBoothSlots={elements.filter(e => e.type === "BOOTH_SLOT").length}
                 linkedCount={linkedBoothIds.size}
               />
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

type LegendSlotStatusMap = Map<string, { commercialStatus: string; priceCents: number }>

function MapLegend({
  slotStatusMap,
  totalBoothSlots,
  linkedCount,
}: {
  slotStatusMap: LegendSlotStatusMap
  totalBoothSlots: number
  linkedCount: number
}) {
  const statuses = Array.from(slotStatusMap.values()).map(v => v.commercialStatus)
  const blocked   = statuses.filter(s => s === "BLOCKED").length
  const freeTotal = Math.max(0, totalBoothSlots - blocked)

  const items = [
    {
      label: "Livres",
      sublabel: "slots disponíveis",
      count: freeTotal - linkedCount, // Adjusted to count only unlinked and unblocked
      total: totalBoothSlots,
      accent: "#eab308", // yellow-500
      bg: "bg-yellow-50",
      border: "border-yellow-100",
      dot: "bg-yellow-400",
      text: "text-yellow-700",
      bar: "bg-yellow-400",
      barBg: "bg-yellow-100",
    },
    {
      label: "Vinculadas",
      sublabel: "barracas vinculadas",
      count: linkedCount,
      total: totalBoothSlots,
      accent: "#10b981", // emerald-500 (Green)
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      dot: "bg-emerald-400",
      text: "text-emerald-700",
      bar: "bg-emerald-400",
      barBg: "bg-emerald-100",
    },
    {
      label: "Bloqueados",
      sublabel: "slots bloqueados",
      count: blocked,
      total: totalBoothSlots,
      accent: "#ef4444", // red-500
      bg: "bg-red-50",
      border: "border-red-100",
      dot: "bg-red-400",
      text: "text-red-700",
      bar: "bg-red-400",
      barBg: "bg-red-100",
    },
  ]

  return (
    <div className="h-full flex flex-col justify-center gap-5 px-1 py-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
            <MapIcon className="h-8 w-8 text-slate-300" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center">
            <span className="text-[9px] font-black text-slate-400">{totalBoothSlots}</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-extrabold text-slate-800 tracking-tight">Legenda do Mapa</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{totalBoothSlots} slots cadastrados</p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-2" />

      {/* Legend cards */}
      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const pct = totalBoothSlots > 0 ? Math.min(1, item.count / totalBoothSlots) : 0
          return (
            <div
              key={item.label}
              className={`rounded-2xl border ${item.bg} ${item.border} overflow-hidden`}
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.dot} shadow-sm`} />
                  <div>
                    <p className={`text-sm font-bold leading-none ${item.text}`}>{item.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.sublabel}</p>
                  </div>
                </div>
                <span className={`text-2xl font-black tabular-nums leading-none ${item.text}`}>{item.count}</span>
              </div>
              {/* Mini progress bar */}
              <div className={`mx-4 mb-3 h-1 rounded-full ${item.barBg} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${item.bar} transition-all duration-500`}
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Hint */}
      <p className="text-center text-[10px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
        Clique em um slot no mapa para ver detalhes e gerenciar a vaga.
      </p>
    </div>
  )
}
