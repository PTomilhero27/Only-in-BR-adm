"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/toast"
import { Clock, DollarSign, Lock, MapPin, MessageCircle, Plus, Save, ShieldAlert, Store, X } from "lucide-react"
import { StallSize, StallSizeSchema, stallSizeLabel } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import {
  type MarketplaceReservation,
  MarketplaceSlotStatus,
} from "@/app/modules/marketplace/marketplace.schema"
import {
  useMarketplaceReservationsQuery,
  useUpdateSlotPriceMutation,
  useUpdateSlotTentTypesMutation,
} from "@/app/modules/marketplace/marketplace.queries"
import { ConfirmMarketplaceReservationDialog } from "@/app/modules/marketplace/components/confirm-reservation/confirm-marketplace-reservation-dialog"
import { getReservationLinkedStall } from "@/app/modules/marketplace/components/confirm-reservation/confirm-marketplace-reservation.utils"
import { NotifyMissingStallAction } from "@/app/modules/marketplace/components/notify-missing-stall/notify-missing-stall-action"
import { canNotifyMissingStall } from "@/app/modules/marketplace/components/notify-missing-stall/notify-missing-stall.utils"
import { useAvailableStallFairsQuery } from "@/app/modules/fair-maps/fair-maps.queries"
import { useGlobalFair } from "../../../components/global-fair-provider"

interface SlotMapSidebarProps {
  fairId: string
  open: boolean
  isFinalizada: boolean
  selectedSlotData: any
  slotClientKey: string | null
  slotNumber: number | null
  linked: any
  onUnlink: () => Promise<void>
  onLink: (stallFairId: string) => Promise<void>
  onStatusChange: (status: MarketplaceSlotStatus) => Promise<void>
  onClearSelection: () => void
  fairMapData: any
}

const STALL_SIZE_OPTIONS = StallSizeSchema.options as readonly StallSize[]

type TentConfigInput = {
  tentType: StallSize
  priceCents: number
}

function getErrorMessage(err: unknown) {
  if (!err) return "Erro inesperado."
  return (err as any)?.message ?? "Erro inesperado."
}

function formatPrice(cents: number) {
  return (cents / 100).toFixed(2)
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function formatDateTime(value?: string | null) {
  if (!value) return null

  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function parsePriceToCents(value: string) {
  const cents = Math.round(parseFloat(value.replace(",", ".")) * 100)
  return Number.isFinite(cents) ? cents : NaN
}

function normalizeWhatsAppPhone(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "")
  if (!digits) return ""
  return digits.startsWith("55") ? digits : `55${digits}`
}

function commercialStatusLabel(status: MarketplaceSlotStatus) {
  switch (status) {
    case "AVAILABLE":
      return "Livre"
    case "RESERVED":
      return "Reservado"
    case "CONFIRMED":
      return "Confirmado"
    case "BLOCKED":
      return "Bloqueado"
    default:
      return status
  }
}

function commercialStatusBadgeClass(status: MarketplaceSlotStatus) {
  switch (status) {
    case "AVAILABLE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "RESERVED":
      return "border-blue-200 bg-blue-50 text-blue-700"
    case "CONFIRMED":
      return "border-violet-200 bg-violet-50 text-violet-700"
    case "BLOCKED":
      return "border-rose-200 bg-rose-50 text-rose-700"
    default:
      return "border-slate-200 bg-slate-50 text-slate-700"
  }
}

function normalizeTentConfig(config: any): TentConfigInput {
  return {
    tentType: config.tentType as StallSize,
    priceCents: Number(config.priceCents ?? 0),
  }
}

export function SlotMapSidebar({
  fairId,
  open,
  isFinalizada,
  selectedSlotData,
  slotClientKey,
  slotNumber,
  linked,
  onUnlink,
  onLink,
  onStatusChange,
  onClearSelection,
  fairMapData,
}: SlotMapSidebarProps) {
  const { fair } = useGlobalFair()
  const [priceInput, setPriceInput] = React.useState("")
  const [editingPrice, setEditingPrice] = React.useState(false)
  const [tentConfigs, setTentConfigs] = React.useState<TentConfigInput[]>([])
  const [tentPriceStrings, setTentPriceStrings] = React.useState<Record<string, string>>({})
  const [selectedStallFairId, setSelectedStallFairId] = React.useState<string | null>(null)
  const [newTentType, setNewTentType] = React.useState<StallSize | "">("")
  const [newTentPrice, setNewTentPrice] = React.useState("")
  const [blockConfirmOpen, setBlockConfirmOpen] = React.useState(false)
  const [isStatusSubmitting, setIsStatusSubmitting] = React.useState(false)
  const [confirmReservation, setConfirmReservation] =
    React.useState<MarketplaceReservation | null>(null)

  const updatePrice = useUpdateSlotPriceMutation(fairId)
  const updateTentTypes = useUpdateSlotTentTypesMutation(fairId)
  const availableStalls = useAvailableStallFairsQuery(fairId, open && !!slotClientKey && !linked)
  const reservationsQuery = useMarketplaceReservationsQuery(
    fairId,
    open && Boolean(selectedSlotData?.id),
  )

  React.useEffect(() => {
    if (selectedSlotData) {
      const basePrice = formatPrice(selectedSlotData.priceCents ?? 0)
      const configs = ((selectedSlotData.allowedTentTypes as any[]) ?? []).map(normalizeTentConfig)
      const strings: Record<string, string> = {}

      configs.forEach((cfg) => {
        strings[cfg.tentType] = formatPrice(cfg.priceCents)
      })

      setPriceInput(basePrice)
      setTentConfigs(configs)
      setTentPriceStrings(strings)
      setNewTentPrice(basePrice)
    } else {
      setPriceInput("")
      setTentConfigs([])
      setTentPriceStrings({})
      setNewTentPrice("")
    }

    setEditingPrice(false)
    setSelectedStallFairId(null)
    setNewTentType("")
    setBlockConfirmOpen(false)
    setIsStatusSubmitting(false)
    setConfirmReservation(null)
  }, [selectedSlotData])

  const commercialStatus = (selectedSlotData?.commercialStatus ?? "AVAILABLE") as MarketplaceSlotStatus
  const reservation = (selectedSlotData as any)?.reservations?.[0]
  const slotReservations = React.useMemo(
    () =>
      (reservationsQuery.data ?? []).filter(
        (item) => item.fairMapSlotId === selectedSlotData?.id,
      ),
    [reservationsQuery.data, selectedSlotData?.id],
  )
  const activeReservation = React.useMemo<MarketplaceReservation | null>(() => {
    const fromQuery = slotReservations.find((item) => item.status === "ACTIVE") ?? null

    if (fromQuery) return fromQuery
    if (!selectedSlotData?.id || !reservation?.id) return null

    return {
      id: String(reservation.id),
      fairId,
      fairMapSlotId: selectedSlotData.id,
      ownerId:
        typeof reservation.ownerId === "string"
          ? reservation.ownerId
          : "reservation-owner",
      status: "ACTIVE",
      expiresAt:
        typeof reservation.expiresAt === "string" ? reservation.expiresAt : null,
      createdAt:
        typeof reservation.createdAt === "string"
          ? reservation.createdAt
          : new Date().toISOString(),
      updatedAt:
        typeof reservation.updatedAt === "string"
          ? reservation.updatedAt
          : new Date().toISOString(),
      owner: {
        id:
          typeof reservation.ownerId === "string"
            ? reservation.ownerId
            : "reservation-owner",
        fullName:
          typeof reservation.ownerName === "string" ? reservation.ownerName : null,
        document: null,
        email: null,
        phone:
          typeof reservation.ownerPhone === "string" ? reservation.ownerPhone : null,
      },
      fairMapSlot: {
        id: selectedSlotData.id,
        fairMapElementId: selectedSlotData.fairMapElementId,
        code: selectedSlotData.code ?? null,
        label: selectedSlotData.label ?? null,
        priceCents: Number(selectedSlotData.priceCents ?? 0),
        commercialStatus,
        allowedTentTypes: selectedSlotData.allowedTentTypes ?? [],
      },
      selectedTentType: reservation.selectedTentType ?? null,
      priceCents:
        typeof reservation.priceCents === "number" ? reservation.priceCents : null,
      stallId:
        typeof reservation.stallId === "string" ? reservation.stallId : null,
      stall: reservation.stall ?? null,
    } as MarketplaceReservation
  }, [commercialStatus, fairId, reservation, selectedSlotData, slotReservations])
  const convertedReservation = React.useMemo<MarketplaceReservation | null>(
    () => slotReservations.find((item) => item.status === "CONVERTED") ?? null,
    [slotReservations],
  )
  const slotReservationDetails = React.useMemo<MarketplaceReservation | null>(() => {
    return activeReservation ?? convertedReservation ?? slotReservations[0] ?? null
  }, [activeReservation, convertedReservation, slotReservations])
  const confirmedLinkedStall = React.useMemo(
    () => getReservationLinkedStall(slotReservationDetails),
    [slotReservationDetails],
  )
  const confirmedOwnerName =
    slotReservationDetails?.owner?.fullName?.trim() ||
    (typeof reservation?.ownerName === "string" ? reservation.ownerName : null)
  const confirmedOwnerPhone =
    slotReservationDetails?.owner?.phone?.trim() ||
    (typeof reservation?.ownerPhone === "string" ? reservation.ownerPhone : null)
  const confirmedStallSizeLabel = confirmedLinkedStall?.stallSize
    ? stallSizeLabel(confirmedLinkedStall.stallSize)
    : null
  const notifyMissingStallReservation = canNotifyMissingStall({
    reservation: convertedReservation,
    slotStatus: commercialStatus,
    hasLinkedSlotStall: Boolean(linked),
    hasReservationStall: Boolean(confirmedLinkedStall),
  })
    ? convertedReservation
    : null
  const reservationTentType = reservation?.selectedTentType as StallSize | null | undefined
  const configuredReservedTentPrice =
    reservationTentType
      ? ((selectedSlotData?.allowedTentTypes as any[]) ?? []).find((cfg) => cfg?.tentType === reservationTentType)?.priceCents
      : null
  const reservationPriceCents =
    typeof reservation?.priceCents === "number"
      ? reservation.priceCents
      : typeof configuredReservedTentPrice === "number"
        ? configuredReservedTentPrice
        : Number(selectedSlotData?.priceCents ?? 0)
  const reservationTentLabel = reservationTentType ? stallSizeLabel(reservationTentType) : "Nao informado"
  const reservationPriceLabel = formatCurrency(reservationPriceCents)
  const reservationExpiresAtLabel = formatDateTime(reservation?.expiresAt)
  const hasReservation = commercialStatus === "RESERVED" || Boolean(reservation)
  const slotLabel = slotNumber ? `Slot ${slotNumber}` : "este slot"
  const slotReference = slotNumber
    ? `#${slotNumber}`
    : selectedSlotData?.label || selectedSlotData?.code || slotClientKey || "slot selecionado"
  const fairName = fair?.name || null
  const mapTitle = fairMapData?.template?.title || null
  const whatsappPhone = normalizeWhatsAppPhone(reservation?.ownerPhone)
  const whatsappText = reservation
    ? [
        `Ola ${reservation.ownerName}, tudo bem?`,
        "",
        `Estamos entrando em contato sobre sua reserva do slot ${slotReference}${mapTitle ? ` no mapa ${mapTitle}` : ""}${fairName ? ` da feira ${fairName}` : ""}.`,
        reservationTentType ? `Tamanho reservado: ${reservationTentLabel}.` : null,
        reservationPriceCents > 0 ? `Valor da reserva: ${reservationPriceLabel}.` : null,
        reservationExpiresAtLabel ? `Validade da reserva: ${reservationExpiresAtLabel}.` : null,
        "",
        "Se quiser, podemos seguir com a confirmacao da sua participacao.",
      ]
        .filter(Boolean)
        .join("\n")
    : ""

  const remainingTentOptions = React.useMemo(
    () => STALL_SIZE_OPTIONS.filter((size) => !tentConfigs.some((cfg) => cfg.tentType === size)),
    [tentConfigs],
  )

  const handleUpdatePrice = async () => {
    if (!selectedSlotData) return

    const cents = parsePriceToCents(priceInput)
    if (isNaN(cents) || cents < 0) {
      toast.error({ title: "Preço inválido" })
      return
    }

    try {
      await updatePrice.mutateAsync({ slotId: selectedSlotData.id, priceCents: cents })
      toast.success({ title: "Preço base atualizado" })
      setEditingPrice(false)
    } catch (err) {
      toast.error({ title: "Erro ao atualizar", subtitle: getErrorMessage(err) })
    }
  }

  const handleSetAvailable = async () => {
    if (isFinalizada || isStatusSubmitting || commercialStatus === "AVAILABLE") return

    try {
      setIsStatusSubmitting(true)
      await onStatusChange("AVAILABLE")
    } finally {
      setIsStatusSubmitting(false)
    }
  }

  const handleConfirmBlock = async () => {
    if (isFinalizada || isStatusSubmitting || commercialStatus === "BLOCKED") return

    try {
      setIsStatusSubmitting(true)
      await onStatusChange("BLOCKED")
      setBlockConfirmOpen(false)
    } finally {
      setIsStatusSubmitting(false)
    }
  }

  const handleTentPriceInputChange = (tentType: StallSize, rawValue: string) => {
    const normalized = rawValue.replace(",", ".")
    setTentPriceStrings((prev) => ({ ...prev, [tentType]: normalized }))

    const cents = parsePriceToCents(normalized)
    if (isNaN(cents)) return

    setTentConfigs((prev) =>
      prev.map((cfg) => (cfg.tentType === tentType ? { ...cfg, priceCents: cents } : cfg)),
    )
  }

  const handleRemoveTentConfig = (tentType: StallSize) => {
    setTentConfigs((prev) => prev.filter((cfg) => cfg.tentType !== tentType))
    setTentPriceStrings((prev) => {
      const next = { ...prev }
      delete next[tentType]
      return next
    })
  }

  const handleAddTentConfig = () => {
    if (!newTentType) {
      toast.error({ title: "Selecione um tamanho" })
      return
    }

    if (tentConfigs.some((cfg) => cfg.tentType === newTentType)) {
      toast.error({ title: "Esse tipo já está configurado" })
      return
    }

    const cents = parsePriceToCents(newTentPrice)
    if (isNaN(cents) || cents < 0) {
      toast.error({ title: "Informe um valor válido" })
      return
    }

    setTentConfigs((prev) => [...prev, { tentType: newTentType, priceCents: cents }])
    setTentPriceStrings((prev) => ({ ...prev, [newTentType]: formatPrice(cents) }))
    setNewTentType("")
    setNewTentPrice(priceInput || formatPrice(selectedSlotData?.priceCents ?? 0))
  }

  const buildTentConfigsForSubmit = () => {
    if (!newTentType) return tentConfigs

    if (tentConfigs.some((cfg) => cfg.tentType === newTentType)) {
      toast.error({ title: "Esse tipo ja esta configurado" })
      return null
    }

    const cents = parsePriceToCents(newTentPrice)
    if (isNaN(cents) || cents < 0) {
      toast.error({ title: "Informe um valor valido para o novo tamanho" })
      return null
    }

    return [...tentConfigs, { tentType: newTentType, priceCents: cents }].map(normalizeTentConfig)
  }

  const handleSaveTentTypes = async () => {
    if (!selectedSlotData) return

    const nextConfigs = buildTentConfigsForSubmit()
    if (!nextConfigs) return
    const sanitizedConfigs = nextConfigs.map(normalizeTentConfig)

    if (nextConfigs !== tentConfigs && newTentType) {
      const cents = parsePriceToCents(newTentPrice)
      setTentConfigs(sanitizedConfigs)
      setTentPriceStrings((prev) => ({ ...prev, [newTentType]: formatPrice(cents) }))
      setNewTentType("")
      setNewTentPrice(priceInput || formatPrice(selectedSlotData.priceCents ?? 0))
    }

    try {
      await updateTentTypes.mutateAsync({ slotId: selectedSlotData.id, configurations: sanitizedConfigs })
      toast.success({ title: "Tendas salvas" })
    } catch (err) {
      toast.error({ title: "Erro ao salvar tendas", subtitle: getErrorMessage(err) })
    }
  }

  return (
    <>
      <aside className="h-full flex flex-col bg-slate-50/50 backdrop-blur-md rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="p-3 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                S{slotNumber ?? "—"}
              </div>
              <div className="min-w-0">
                <h3 className="text-[13px] font-bold text-slate-900 leading-none truncate">
                  Slot {slotNumber ?? "Industrial"}
                </h3>
                <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                  {slotClientKey?.slice(0, 16)}...
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-rose-600 shrink-0"
              onClick={onClearSelection}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {!linked && commercialStatus !== "CONFIRMED" && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Status comercial
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {hasReservation
                      ? "Ao bloquear, a reserva ativa deste slot sera removida."
                      : "Defina se o slot fica livre ou indisponivel para novas vendas."}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${commercialStatusBadgeClass(commercialStatus)}`}
                >
                  {commercialStatusLabel(commercialStatus)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={commercialStatus === "AVAILABLE" ? "default" : "outline"}
                  className={
                    commercialStatus === "AVAILABLE"
                      ? "h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "h-9 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  }
                  disabled={isFinalizada || isStatusSubmitting || commercialStatus === "AVAILABLE"}
                  onClick={() => void handleSetAvailable()}
                >
                  Livre
                </Button>

                <Button
                  type="button"
                  variant={commercialStatus === "BLOCKED" ? "default" : "outline"}
                  className={
                    commercialStatus === "BLOCKED"
                      ? "h-9 bg-rose-600 hover:bg-rose-700 text-white"
                      : "h-9 border-rose-200 text-rose-700 hover:bg-rose-50"
                  }
                  disabled={isFinalizada || isStatusSubmitting || commercialStatus === "BLOCKED"}
                  onClick={() => setBlockConfirmOpen(true)}
                >
                  Bloqueado
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2 lg:p-3 space-y-3">
          {commercialStatus === "RESERVED" && reservation && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-3 shadow-sm animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-4 ring-blue-50 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-blue-900 truncate">Reserva Ativa</h4>
                  <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tight">Aguardando confirmacao</p>
                </div>
              </div>

              <div className="bg-white/60 p-3 rounded-lg border border-blue-100 space-y-2">
                <div className="flex items-center gap-2 text-blue-900">
                  <span className="text-[11px] font-bold">{reservation.ownerName}</span>
                </div>
                <div className="flex items-center gap-2 text-blue-800">
                  <MessageCircle className="h-3 w-3 opacity-60" />
                  <span className="text-[11px]">{reservation.ownerPhone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-blue-100 bg-white/70 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-500">Tamanho</p>
                  <p className="mt-1 text-[11px] font-semibold text-blue-900">{reservationTentLabel}</p>
                </div>

                <div className="rounded-lg border border-blue-100 bg-white/70 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-500">Valor</p>
                  <p className="mt-1 text-[11px] font-semibold text-emerald-700">{reservationPriceLabel}</p>
                </div>
              </div>

              {reservationExpiresAtLabel && (
                <div className="rounded-lg border border-blue-100 bg-white/70 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-500">Reserva expira</p>
                  <p className="mt-1 text-[11px] font-semibold text-blue-900">{reservationExpiresAtLabel}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 border-t border-blue-100 pt-3">
                <Button
                  className="bg-[#25D366] hover:bg-[#20ba59] text-white gap-2 h-9"
                  size="sm"
                  disabled={!whatsappPhone}
                  onClick={() => {
                    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappText)}`, "_blank")
                    /*
                      `https://wa.me/55${reservation.ownerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${reservation.ownerName}, sobre seu interesse no slot ${label}...`)}`,
                    */
                  }}
                >
                  <MessageCircle className="h-4 w-4 fill-current" /> WhatsApp
                </Button>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 h-9"
                    size="sm"
                    disabled={!activeReservation || reservationsQuery.isLoading}
                    onClick={() => {
                      if (activeReservation) setConfirmReservation(activeReservation)
                    }}
                  >
                    {reservationsQuery.isLoading && !activeReservation
                      ? "Carregando..."
                      : "Confirmar reserva"}
                  </Button>
                  <Button
                    className="flex-1 border-blue-600 text-blue-700 h-9"
                    variant="outline"
                    size="sm"
                    onClick={() => void onStatusChange("AVAILABLE")}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {commercialStatus === "AVAILABLE" && !linked && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-2.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <Label className="text-[11px] font-bold text-slate-800">Valor Unitario Base</Label>
                </div>

                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-mono">
                      R$
                    </span>
                    <Input
                      value={priceInput}
                      onChange={(e) => {
                        setPriceInput(e.target.value)
                        setEditingPrice(true)
                      }}
                      className="h-8 pl-8 text-[12px] font-mono bg-slate-50 border-slate-200 focus:bg-white"
                      disabled={isFinalizada}
                    />
                  </div>

                  {editingPrice && (
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-indigo-600 hover:bg-indigo-700 shrink-0 shadow-lg shadow-indigo-100"
                      onClick={() => void handleUpdatePrice()}
                      disabled={isFinalizada}
                    >
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <Label className="text-[11px] font-bold text-slate-800">Tendas & Precos</Label>
                  </div>
                  <Badge variant="secondary" className="text-[9px] bg-slate-100 rounded-md px-1 leading-none h-4">
                    {tentConfigs.length}
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  {tentConfigs.map((cfg) => (
                    <div key={cfg.tentType} className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-slate-800 truncate">
                            {stallSizeLabel(cfg.tentType)}
                          </p>
                          <p className="text-[10px] text-slate-500">Preco especifico para esse tamanho</p>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-300 hover:text-rose-500 hover:bg-rose-50 shrink-0"
                          onClick={() => handleRemoveTentConfig(cfg.tentType)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="mt-2 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-mono">
                          R$
                        </span>
                        <Input
                          className="h-8 pl-8 text-[11px] font-mono bg-white border-slate-200"
                          value={tentPriceStrings[cfg.tentType] ?? formatPrice(cfg.priceCents)}
                          onChange={(e) => handleTentPriceInputChange(cfg.tentType, e.target.value)}
                          onBlur={() =>
                            setTentPriceStrings((prev) => ({
                              ...prev,
                              [cfg.tentType]: formatPrice(
                                tentConfigs.find((item) => item.tentType === cfg.tentType)?.priceCents ?? 0,
                              ),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}

                  {tentConfigs.length === 0 && (
                    <div className="py-6 text-center border-2 border-dashed rounded-lg border-slate-100 bg-slate-50/30">
                      <p className="text-[10px] text-slate-400 italic">Sem configuracoes especificas.</p>
                    </div>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5 text-indigo-600" />
                    <Label className="text-[11px] font-bold text-slate-800">Adicionar tipo de tenda</Label>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">Tamanho disponivel</Label>
                      <Select
                        value={newTentType || undefined}
                        onValueChange={(value) => setNewTentType(value as StallSize)}
                        disabled={remainingTentOptions.length === 0}
                      >
                        <SelectTrigger className="h-9 text-[11px] bg-white border-slate-200">
                          <SelectValue placeholder="Selecione um tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                          {remainingTentOptions.map((size) => (
                            <SelectItem key={size} value={size} className="text-xs">
                              {stallSizeLabel(size)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-semibold text-slate-500">Valor para esse tamanho</Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-mono">
                          R$
                        </span>
                        <Input
                          value={newTentPrice}
                          onChange={(e) => setNewTentPrice(e.target.value)}
                          className="h-9 pl-8 text-[11px] font-mono bg-white border-slate-200"
                          placeholder="0,00"
                          disabled={remainingTentOptions.length === 0}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      onClick={handleAddTentConfig}
                      disabled={isFinalizada || remainingTentOptions.length === 0}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Adicionar tamanho
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => void handleSaveTentTypes()}
                      className="h-9 w-full px-4 bg-slate-900 hover:bg-slate-800 text-[11px]"
                      disabled={isFinalizada}
                    >
                      Salvar Tendas
                    </Button>
                  </div>

                  {remainingTentOptions.length === 0 && (
                    <p className="text-[10px] text-slate-500">
                      Todos os tamanhos cadastrados no sistema ja foram adicionados a este slot.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-orange-500" />
              <Label className="text-xs font-bold text-slate-800">Barraca Selecionada</Label>
            </div>

            {linked ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-inner">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{linked.stallFair?.stallPdvName || "—"}</p>
                      <p className="text-[10px] text-slate-500 truncate">{linked.stallFair?.ownerName || "—"}</p>
                    </div>
                  </div>
                </div>

                <Button variant="destructive" size="sm" className="w-full h-9 gap-2 shadow-lg shadow-rose-100" onClick={onUnlink}>
                  <X className="h-4 w-4" /> Desvincular Barraca
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {commercialStatus === "RESERVED" && reservation ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <Store className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{reservation.ownerName}</p>
                          <p className="text-[10px] text-slate-500 truncate">Reserva aguardando aprovacao</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-blue-100 bg-white/80 p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Tamanho</p>
                          <p className="mt-1 text-[11px] font-semibold text-slate-900">{reservationTentLabel}</p>
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-white/80 p-2.5">
                          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Valor</p>
                          <p className="mt-1 text-[11px] font-semibold text-emerald-700">{reservationPriceLabel}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                      <p className="text-[10px] text-slate-500">
                        Esse slot ainda nao pode ser vinculado porque existe uma reserva ativa para ele.
                      </p>
                    </div>
                  </div>
                ) : commercialStatus === "CONFIRMED" ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                          <Store className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 break-words">
                              {confirmedLinkedStall?.stallName || "Aguardando barraca"}
                            </p>
                            <Badge
                              variant="outline"
                              className="border-violet-200 bg-white text-[10px] font-bold text-violet-700"
                            >
                              {confirmedLinkedStall ? "Reserva confirmada" : "Aguardando barraca"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-500 break-words">
                            {confirmedOwnerName
                              ? `Vinculado a ${confirmedOwnerName}`
                              : "Reserva confirmada e aguardando definicao da barraca."}
                          </p>
                          {(confirmedStallSizeLabel || confirmedOwnerPhone) ? (
                            <p className="mt-1 text-[10px] text-slate-500 break-words">
                              {[confirmedStallSizeLabel, confirmedOwnerPhone].filter(Boolean).join(" • ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {confirmedLinkedStall ? (
                      <div className="rounded-lg border border-dashed border-violet-200 bg-white p-3">
                        <p className="text-[10px] text-violet-700">
                          A barraca informada na confirmacao ja foi encontrada e permanece aguardando vinculo visual no mapa.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/80 p-3">
                        <div className="flex items-start gap-2">
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                          <div>
                            <p className="text-[11px] font-bold text-amber-800">Aguardando barraca</p>
                            <p className="mt-1 text-[10px] text-amber-700">
                              O expositor ja foi confirmado na feira, mas ainda nao existe uma barraca vinculada a este slot.
                            </p>
                          </div>
                        </div>

                        {notifyMissingStallReservation ? (
                          <NotifyMissingStallAction
                            fairId={fairId}
                            fairName={fairName}
                            slotLabel={slotReference}
                            reservation={notifyMissingStallReservation}
                            buttonClassName="mt-3 h-9 w-full border-amber-300 bg-white text-amber-800 hover:bg-amber-100"
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : commercialStatus !== "AVAILABLE" ? (
                  <div className="p-4 py-8 text-center bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-100">
                    <Lock className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-400">
                      Slot reservado ou bloqueado.
                      <br />
                      Libere o slot para realizar o vinculo.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Command className="border-none shadow-none">
                        <CommandInput placeholder="Localizar barraca..." className="h-9 text-xs border-none focus:ring-0" />
                        <CommandList className="max-h-40 overflow-auto">
                          <CommandEmpty className="py-4 text-[11px]">Nenhuma barraca.</CommandEmpty>
                          <CommandGroup>
                            {(availableStalls.data as any[])?.map((sf) => (
                              <CommandItem
                                key={sf.id}
                                onSelect={() => setSelectedStallFairId(sf.id)}
                                className="text-[11px] cursor-pointer hover:bg-slate-50"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="truncate pr-2">
                                    <span className="font-bold text-slate-900">{sf.stallPdvName}</span>
                                    <span className="text-slate-400 italic ml-2">{sf.ownerName?.split(" ")[0]}</span>
                                  </div>
                                  {selectedStallFairId === sf.id && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm" />}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>

                    <Button
                      size="sm"
                      className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
                      onClick={() => selectedStallFairId && void onLink(selectedStallFairId)}
                      disabled={!selectedStallFairId || isFinalizada}
                    >
                      Vincular ao Slot
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent className="sm:max-w-[460px]">
          <AlertDialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle>Bloquear {slotLabel}?</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {hasReservation
                    ? `Esse bloqueio vai remover a reserva ativa${reservation?.ownerName ? ` de ${reservation.ownerName}` : ""} e deixar o slot indisponivel no marketplace.`
                    : `O ${slotLabel.toLowerCase()} ficara indisponivel para novas reservas e vinculos ate ser liberado novamente.`}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStatusSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              disabled={isStatusSubmitting}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmBlock()
              }}
            >
              {isStatusSubmitting ? "Bloqueando..." : "Confirmar bloqueio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmMarketplaceReservationDialog
        open={Boolean(confirmReservation)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setConfirmReservation(null)
        }}
        fairId={fairId}
        fairName={fairName}
        slotLabel={slotReference}
        reservation={confirmReservation}
      />
    </>
  )
}
