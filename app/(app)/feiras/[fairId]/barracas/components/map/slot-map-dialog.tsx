"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/toast"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Maximize2, Minimize2, Plus, Save, X } from "lucide-react"

import { MapElement, MapTool } from "../../../mapa/types/types"
import { FairMap2DCanvas } from "../../../mapa/editor/components/fair-map-2d-canvas"

import {
  useAvailableStallFairsQuery,
  useFairMapQuery,
  useLinkBoothSlotMutation,
} from "@/app/modules/fair-maps/fair-maps.queries"
import { useUpdateMapTemplateMutation } from "@/app/modules/mapa-templates/map-templates.queries"
import type { MapTemplateElement } from "@/app/modules/mapa-templates/map-templates.schema"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void

  fairId: string

  // contexto (vem da tabela ou do clique no mapa)
  exhibitorName: string
  slotNumber: number | null
  slotClientKey: string | null
}

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ")
}

function useBodyScrollLock(locked: boolean) {
  React.useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])
}

/**
 * Focus trap simples:
 * - TAB/Shift+TAB não escapam do modal
 * - ESC chama onEscape
 */
function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement>,
  onEscape: () => void,
) {
  React.useEffect(() => {
    if (!active) return

    function getFocusable(root: HTMLElement) {
      const selector =
        [
          'a[href]',
          'button:not([disabled])',
          'textarea:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(",")

      return Array.from(root.querySelectorAll<HTMLElement>(selector))
        .filter((el) => !el.hasAttribute("disabled"))
        .filter((el) => el.tabIndex !== -1)
    }

    const el = containerRef.current
    if (!el) return

    queueMicrotask(() => {
      const focusables = getFocusable(el)
      ;(focusables[0] ?? el).focus?.()
    })

    function onKeyDown(e: KeyboardEvent) {
      if (!containerRef.current) return

      if (e.key === "Escape") {
        e.preventDefault()
        onEscape()
        return
      }

      if (e.key !== "Tab") return
      const root = containerRef.current
      if (!root) return

      const focusables = getFocusable(root)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement as HTMLElement | null

      if (!e.shiftKey) {
        if (!current || current === last) {
          e.preventDefault()
          first.focus()
        }
      } else {
        if (!current || current === first) {
          e.preventDefault()
          last.focus()
        }
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [active, containerRef, onEscape])
}

function newClientId(prefix = "el") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function snapInt(n: number) {
  return Math.round(n)
}

function normalizeStyle(style: unknown) {
  const fallback = { fill: "#CBD5E1", stroke: "#0F172A", strokeWidth: 2, opacity: 0.65 }
  if (!style || typeof style !== "object") return fallback
  const s = style as any
  return {
    fill: typeof s.fill === "string" ? s.fill : fallback.fill,
    stroke: typeof s.stroke === "string" ? s.stroke : fallback.stroke,
    strokeWidth: typeof s.strokeWidth === "number" ? s.strokeWidth : fallback.strokeWidth,
    opacity: typeof s.opacity === "number" ? s.opacity : fallback.opacity,
  }
}

function adaptTemplateElementToCanvasElement(el: MapTemplateElement): MapElement {
  const style = normalizeStyle((el as any).style)
  const clientKey = (el as any).clientKey ?? (el as any).id
  const t = String((el as any).type ?? "RECT")

  if (t === "LINE") {
    return {
      id: clientKey,
      type: "LINE",
      x: 0,
      y: 0,
      rotation: (el as any).rotation ?? 0,
      style,
      points: ((el as any).points ?? []) as number[],
    } as any
  }

  if (t === "TEXT") {
    const text = (el as any).text ?? (el as any).label ?? "Texto"
    const fontSize = (el as any).fontSize ?? (el as any)?.style?.fontSize ?? 18
    return {
      id: clientKey,
      type: "TEXT",
      x: (el as any).x ?? 0,
      y: (el as any).y ?? 0,
      rotation: (el as any).rotation ?? 0,
      style,
      text,
      fontSize,
      boxed: (el as any).boxed ?? (el as any)?.style?.boxed ?? true,
      padding: (el as any).padding ?? (el as any)?.style?.padding ?? 10,
      borderRadius: (el as any).borderRadius ?? (el as any)?.style?.borderRadius ?? 10,
    } as any
  }

  if (t === "TREE") {
    return {
      id: clientKey,
      type: "TREE",
      x: (el as any).x ?? 0,
      y: (el as any).y ?? 0,
      rotation: (el as any).rotation ?? 0,
      style,
      radius: ((el as any).radius ?? 14) as number,
      label: (el as any).label ?? undefined,
    } as any
  }

  const rectKind = t === "BOOTH_SLOT" ? "BOOTH" : t === "SQUARE" ? "SQUARE" : "RECT"

  return {
    id: clientKey,
    type: "RECT",
    rectKind,
    x: (el as any).x ?? 0,
    y: (el as any).y ?? 0,
    rotation: (el as any).rotation ?? 0,
    style,
    width: ((el as any).width ?? 60) as number,
    height: ((el as any).height ?? 60) as number,
    isLinkable: rectKind === "BOOTH",
    number: rectKind === "BOOTH" ? ((el as any).number ?? undefined) : undefined,
    label: rectKind !== "BOOTH" ? ((el as any).label ?? "") : undefined,
  } as any
}

function getNextBoothNumberFrom(elements: MapElement[]) {
  const max = elements
    .filter((e) => e.type === "RECT" && (e as any).rectKind === "BOOTH")
    .reduce((acc, e: any) => Math.max(acc, typeof e.number === "number" ? e.number : 0), 0)
  return Math.max(1, max + 1)
}

function getErrorMessage(err: unknown) {
  if (!err) return "Erro inesperado."
  if (typeof err === "string") return err
  if (typeof err === "object" && err !== null) {
    const anyErr = err as any
    return anyErr?.message ?? anyErr?.response?.message ?? anyErr?.response?.error ?? "Erro inesperado."
  }
  return "Erro inesperado."
}

export function SlotMapDialog({
  open,
  onOpenChange,
  fairId,
  exhibitorName,
  slotNumber: slotNumberFromProps,
  slotClientKey: slotClientKeyFromProps,
}: Props) {
  useBodyScrollLock(open)

  // ✅ states
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [addingBooth, setAddingBooth] = React.useState(false)

  const [elements, setElements] = React.useState<MapElement[]>([])
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [selectedStallFairId, setSelectedStallFairId] = React.useState<string | null>(null)

  const modalRef = React.useRef<HTMLDivElement | null>(null)

  const close = React.useCallback(() => {
    setIsFullscreen(false)
    setAddingBooth(false)
    setSelectedIds([])
    setSelectedStallFairId(null)
    onOpenChange(false)
  }, [onOpenChange])

  useFocusTrap(open, modalRef as any, close)

  const fairMap = useFairMapQuery(fairId)

  const tool: MapTool = addingBooth ? "BOOTH" : "SELECT"
  const backgroundUrl = (fairMap.data as any)?.template?.backgroundUrl ?? undefined

  // ✅ init elements
  const templateElements = fairMap.data?.template?.elements ?? []
  const initialElements = React.useMemo<MapElement[]>(() => {
    const raw = templateElements as MapTemplateElement[]
    return raw.map((el) => adaptTemplateElementToCanvasElement(el))
  }, [templateElements])

  React.useEffect(() => {
    setElements(initialElements)
    setSelectedIds([])
    setSelectedStallFairId(null)
  }, [initialElements, open])

  /**
   * ✅ foco vindo da TABELA
   * - prioridade: slotClientKey
   * - fallback: slotNumber
   */
  React.useEffect(() => {
    if (!open) return
    if (!initialElements.length) return

    // 1) pelo clientKey (id do elemento)
    if (slotClientKeyFromProps) {
      const exists = initialElements.some((e) => e.id === slotClientKeyFromProps)
      if (exists) {
        setSelectedIds([slotClientKeyFromProps])
        return
      }
    }

    // 2) pelo número do slot (booth.number)
    if (typeof slotNumberFromProps === "number") {
      const found = initialElements.find(
        (e) => e.type === "RECT" && (e as any).rectKind === "BOOTH" && (e as any).number === slotNumberFromProps,
      )
      if (found) {
        setSelectedIds([found.id])
      }
    }
  }, [open, initialElements, slotClientKeyFromProps, slotNumberFromProps])

  // ✅ selection
  const selected = React.useMemo(() => {
    if (selectedIds.length !== 1) return null
    return elements.find((e) => e.id === selectedIds[0]) ?? null
  }, [elements, selectedIds])

  const selectedSlotIsBooth = selected?.type === "RECT" && (selected as any).rectKind === "BOOTH"
  const slotClientKey = selectedSlotIsBooth ? selected!.id : null
  const slotNumber = selectedSlotIsBooth ? ((selected as any).number ?? null) : null
  const hasSelectedSlot = Boolean(slotClientKey)

  // ✅ links
  const linkBySlotClientKey = React.useMemo(() => {
    const map = new Map<string, any>()
    for (const l of fairMap.data?.links ?? []) map.set(String((l as any).slotClientKey), l)
    return map
  }, [fairMap.data?.links])

  const linked = React.useMemo(() => {
    if (!slotClientKey) return null
    return linkBySlotClientKey.get(slotClientKey) ?? null
  }, [slotClientKey, linkBySlotClientKey])

  const linkedBoothIds = React.useMemo(() => {
    const ids = (fairMap.data?.links ?? []).map((l: any) => String(l.slotClientKey))
    return new Set(ids)
  }, [fairMap.data?.links])

  // ✅ link/unlink
  const linkMutation = useLinkBoothSlotMutation(fairId)
  const available = useAvailableStallFairsQuery(fairId, open && !!slotClientKey && !linked)

  React.useEffect(() => {
    if (!open) return
    setSelectedStallFairId(null)
  }, [open, slotClientKey])

  async function handleUnlink() {
    if (!slotClientKey) return
    try {
      await linkMutation.mutateAsync({ slotClientKey, input: { stallFairId: null } })
      toast.success({ title: "Desvinculado", subtitle: "Slot liberado com sucesso." })
      setSelectedStallFairId(null)
    } catch (err) {
      toast.error({ title: "Erro ao desvincular", subtitle: getErrorMessage(err) })
    }
  }

  async function handleLink() {
    if (!slotClientKey || !selectedStallFairId) return
    try {
      await linkMutation.mutateAsync({ slotClientKey, input: { stallFairId: selectedStallFairId } })
      toast.success({ title: "Vinculado", subtitle: "Barraca vinculada ao slot." })
      setSelectedStallFairId(null)
    } catch (err) {
      toast.error({ title: "Erro ao vincular", subtitle: getErrorMessage(err) })
    }
  }

  const canSubmitLink = !!slotClientKey && !!selectedStallFairId && !linkMutation.isPending

  // ✅ add booth (simples)
  const onCreateAtPoint = React.useCallback(
    (pt: { x: number; y: number }) => {
      if (!addingBooth) return
      setElements((prev) => {
        const nextNumber = getNextBoothNumberFrom(prev)
        const booth: MapElement = {
          id: newClientId("booth"),
          type: "RECT",
          rectKind: "BOOTH",
          x: snapInt(pt.x),
          y: snapInt(pt.y),
          rotation: 0,
          width: 70,
          height: 70,
          style: { fill: "#FEF9C3", stroke: "#CA8A04", strokeWidth: 2, opacity: 0.85 },
          isLinkable: true,
          number: nextNumber,
        } as any

        queueMicrotask(() => setSelectedIds([booth.id]))
        return [...prev, booth]
      })
    },
    [addingBooth],
  )



  if (!open) return null

  const sizeClass = isFullscreen ? "w-[100vw] h-[100dvh] rounded-none" : "w-[90vw] h-[90vh] rounded-2xl"

  return (
    <div className="fixed inset-0 z-[100]">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) close()
        }}
      />

      {/* modal shell */}
      <div className="absolute inset-0 flex items-center justify-center p-2 md:p-6">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mapa da feira"
          tabIndex={-1}
          className={cn("bg-background shadow-xl border overflow-hidden outline-none", sizeClass)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="h-full w-full flex flex-col">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xl font-semibold">Mapa da feira</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Expositor: <span className="text-foreground font-medium">{exhibitorName}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      fairId: {fairId}
                    </Badge>

                    {hasSelectedSlot ? (
                      <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Slot {slotNumber ?? "—"}
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-muted text-foreground/70 hover:bg-muted">
                        Nenhum slot
                      </Badge>
                    )}

                    <Badge variant="secondary" className="rounded-full">
                      {(fairMap.data as any)?.template?.title ?? "Mapa"}
                    </Badge>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">

                  <Button
                    variant="outline"
                    size="icon"
                    className="hidden md:inline-flex"
                    onClick={() => setIsFullscreen((v) => !v)}
                    aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>

                  <Button variant="ghost" size="icon" onClick={close} aria-label="Fechar">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator className="mt-4" />
            </div>

            {/* Body */}
            <div className="flex-1 px-6 pb-6 min-h-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Use o mouse/trackpad para <span className="font-medium text-foreground">dar zoom</span> e{" "}
                  <span className="font-medium text-foreground">arrastar</span>.
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    tool: {tool}
                  </Badge>
                  <Badge variant="outline" className="rounded-full">
                    selecionados: {selectedIds.length}
                  </Badge>
                </span>
              </div>

              <div
                className={
                  hasSelectedSlot
                    ? "grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]"
                    : "grid h-full min-h-0 grid-cols-1"
                }
              >
                {/* MAPA */}
                <div className="relative overflow-hidden rounded-xl border bg-background min-h-0">
                  {fairMap.isLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Carregando mapa…</div>
                  ) : fairMap.error ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      Erro ao carregar mapa: {getErrorMessage(fairMap.error)}
                    </div>
                  ) : (
                    <FairMap2DCanvas
                      backgroundUrl={backgroundUrl}
                      elements={elements}
                      setElements={setElements}
                      isEditMode={false}
                      tool={tool}
                      selectedIds={selectedIds}
                      onSelectIds={setSelectedIds}
                      onCreateAtPoint={onCreateAtPoint}
                      linkedBoothIds={linkedBoothIds}
                      enableOperationalBoothClick={!addingBooth}
                      onBoothClick={(id) => setSelectedIds([id])}
                    />
                  )}
                </div>

                {/* PAINEL (só quando tem slot selecionado) */}
                {hasSelectedSlot ? (
                  <aside className="rounded-xl border bg-background p-4 min-h-0 overflow-auto">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">Vínculo do slot</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          slotClientKey: <span className="font-mono">{slotClientKey}</span>
                        </div>
                      </div>

                      {linked ? (
                        <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          Vinculado
                        </Badge>
                      ) : (
                        <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Livre
                        </Badge>
                      )}
                    </div>

                    <Separator className="my-3" />

                    {linked ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">
                                {linked.stallFair?.stallPdvName ?? "Barraca"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {linked.stallFair?.ownerName ?? "—"}
                                {linked.stallFair?.ownerPhone ? ` • ${linked.stallFair.ownerPhone}` : ""}
                              </div>

                              <div className="mt-2 text-xs text-muted-foreground">
                                StallFairId: <span className="font-mono">{linked.stallFairId}</span>
                              </div>
                            </div>

                            <Badge variant="secondary">{linked.stallFair?.stallSize ?? "—"}</Badge>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setSelectedIds([])}>
                            Limpar seleção
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => void handleUnlink()}
                            disabled={linkMutation.isPending}
                          >
                            {linkMutation.isPending ? "Desvinculando..." : "Desvincular"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-xl border p-3">
                          <div className="text-sm font-medium mb-2">
                            Selecione a barraca (StallFair) disponível
                          </div>

                          {available.isLoading ? (
                            <div className="text-sm text-muted-foreground">Carregando opções…</div>
                          ) : available.isError ? (
                            <div className="text-sm text-destructive">Erro ao carregar opções.</div>
                          ) : (
                            <Command>
                              <CommandInput placeholder="Buscar por barraca ou expositor..." />
                              <CommandList className="max-h-64">
                                <CommandEmpty>Nenhuma barraca disponível.</CommandEmpty>

                                <CommandGroup heading="Disponíveis (sem vínculo)">
                                  {(available.data as any[])?.map((sf) => (
                                    <CommandItem
                                      key={sf.id}
                                      value={`${sf.stallPdvName} ${sf.ownerName} ${sf.stallSize}`}
                                      onSelect={() => setSelectedStallFairId(sf.id)}
                                    >
                                      <div className="flex w-full items-center justify-between gap-3">
                                        <div className="min-w-0">
                                          <div className="font-medium truncate">{sf.stallPdvName}</div>
                                          <div className="text-xs text-muted-foreground truncate">
                                            {sf.ownerName}
                                            {sf.ownerPhone ? ` • ${sf.ownerPhone}` : ""}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary">{sf.stallSize}</Badge>
                                          {selectedStallFairId === sf.id ? (
                                            <Badge className="bg-emerald-200 text-black hover:bg-emerald-200">
                                              Selecionada
                                            </Badge>
                                          ) : null}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          )}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setSelectedIds([])}>
                            Limpar seleção
                          </Button>

                          <Button onClick={() => void handleLink()} disabled={!canSubmitLink}>
                            {linkMutation.isPending ? "Vinculando..." : "Vincular"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </aside>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <div className="text-xs text-muted-foreground">
                Você pode abrir pela tabela já focando no slot. “Adicionar barraca” cria slots novos (MVP).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}