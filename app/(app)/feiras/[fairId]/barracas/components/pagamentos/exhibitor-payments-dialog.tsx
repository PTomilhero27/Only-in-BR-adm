"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"


import {
  useFairExhibitorsQuery,
  useSettleInstallmentsMutation,
  useCreateInstallmentPaymentMutation,
  useRescheduleInstallmentMutation,
} from "@/app/modules/fairs/exhibitors/exhibitors.queries"
import type {
  FairExhibitorRow,
  PurchasePaymentSummary,
  PurchaseInstallment,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { stallSizeLabel } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import {
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Receipt,
  CalendarClock,
} from "lucide-react"
import { UnitPriceInput } from "@/app/(app)/interessados/components/tabs/fairs/unit-price-input"

function formatDateBR(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return new Intl.DateTimeFormat("pt-BR").format(d)
}

function formatMoneyBRLFromCents(cents?: number | null) {
  if (cents === null || cents === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

function paymentStatusLabel(status?: string | null) {
  switch (status) {
    case "PAID":
      return "Pago"
    case "PARTIALLY_PAID":
      return "Parcial"
    case "OVERDUE":
      return "Atrasado"
    case "PENDING":
      return "Pendente"
    case "CANCELLED":
      return "Cancelado"
    default:
      return status ?? "—"
  }
}

function planStatusTone(status?: string | null) {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "PARTIALLY_PAID":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "OVERDUE":
      return "border-rose-200 bg-rose-50 text-rose-700"
    default:
      return "border-muted/60 bg-muted/20 text-foreground"
  }
}

function getInstallmentState(input: { dueDate: string; paidAt?: string | null }) {
  const isPaid = !!input.paidAt
  if (isPaid) return { state: "PAID" as const }

  const today = new Date()
  const due = new Date(input.dueDate)

  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const due0 = new Date(due.getFullYear(), due.getMonth(), due.getDate())

  const isOverdue = due0.getTime() < today0.getTime()
  return { state: isOverdue ? ("OVERDUE" as const) : ("DUE" as const) }
}

function installmentCardTone(state: "PAID" | "DUE" | "OVERDUE") {
  switch (state) {
    case "PAID":
      return {
        wrap: "border-emerald-200 bg-emerald-50/60",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-700" />,
        label: "Paga",
      }
    case "OVERDUE":
      return {
        wrap: "border-rose-200 bg-rose-50/60",
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        icon: <AlertTriangle className="h-4 w-4 text-rose-700" />,
        label: "Atrasada",
      }
    case "DUE":
    default:
      return {
        wrap: "border-amber-200 bg-amber-50/60",
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        icon: <Clock3 className="h-4 w-4 text-amber-700" />,
        label: "Em aberto",
      }
  }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ownerFairId: string | null
  fairId: string
}

function pickDefaultPurchaseId(row: FairExhibitorRow | null) {
  return row?.purchasesPayments?.[0]?.purchaseId ?? null
}

function isoToDateOnly(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function centsFromBRLText(text: string) {
  const raw = (text ?? "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "")

  const num = Number(raw)
  if (!Number.isFinite(num)) return 0
  return Math.round(num * 100)
}

export function ExhibitorPaymentsDialog({ open, onOpenChange, ownerFairId, fairId }: Props) {
  const exhibitorsQuery = useFairExhibitorsQuery(fairId)

  const settle = useSettleInstallmentsMutation(fairId)
  const createPayment = useCreateInstallmentPaymentMutation(fairId)
  const reschedule = useRescheduleInstallmentMutation(fairId)

  const row: FairExhibitorRow | null = React.useMemo(() => {
    if (!ownerFairId) return null
    const items = exhibitorsQuery.data?.items ?? []
    return items.find((i) => i.ownerFairId === ownerFairId) ?? null
  }, [exhibitorsQuery.data?.items, ownerFairId])

  const [selectedPurchaseId, setSelectedPurchaseId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setSelectedPurchaseId((prev) => prev ?? pickDefaultPurchaseId(row))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ownerFairId])

  React.useEffect(() => {
    if (!open) return
    const exists = row?.purchasesPayments?.some((p) => p.purchaseId === selectedPurchaseId)
    if (!exists) setSelectedPurchaseId(pickDefaultPurchaseId(row))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.purchasesPayments, open])

  const purchases = row?.purchasesPayments ?? []
  const selectedPurchase: PurchasePaymentSummary | null =
    purchases.find((p) => p.purchaseId === selectedPurchaseId) ?? null

  const isBusy = settle.isPending || createPayment.isPending || reschedule.isPending
  const loadingRow = open && ownerFairId && exhibitorsQuery.isLoading

  async function confirmInstallmentPaid(ownerId: string, purchaseId: string, installmentNumber: number) {
    await settle.mutateAsync({
      ownerId,
      input: { action: "SET_PAID", purchaseId, numbers: [installmentNumber] },
    })
  }

  async function undoInstallmentPaid(ownerId: string, purchaseId: string, installmentNumber: number) {
    await settle.mutateAsync({
      ownerId,
      input: { action: "SET_UNPAID", purchaseId, numbers: [installmentNumber] },
    })
  }

  // ✅ controle de “qual card abriu qual form”
  const [payFormOpen, setPayFormOpen] = React.useState<Record<number, boolean>>({})
  const [rescheduleOpen, setRescheduleOpen] = React.useState<Record<number, boolean>>({})

  // ✅ agora valor é em CENTAVOS (mas input mostra em reais)
  const [payAmountCents, setPayAmountCents] = React.useState<Record<number, number>>({})
  const [payDate, setPayDate] = React.useState<Record<number, string>>({})
  const [payNote, setPayNote] = React.useState<Record<number, string>>({})

  const [newDueDate, setNewDueDate] = React.useState<Record<number, string>>({})
  const [rescheduleReason, setRescheduleReason] = React.useState<Record<number, string>>({})

  function togglePayForm(n: number) {
    setPayFormOpen((s) => ({ ...s, [n]: !s[n] }))
    setPayDate((s) => ({ ...s, [n]: s[n] ?? isoToDateOnly(new Date().toISOString()) }))
    setPayAmountCents((s) => ({ ...s, [n]: s[n] ?? 0 }))
    setPayNote((s) => ({ ...s, [n]: s[n] ?? "" }))

    // opcional: fecha o outro form quando abre este
    setRescheduleOpen((s) => ({ ...s, [n]: false }))
  }

  function toggleReschedule(n: number, installment: PurchaseInstallment) {
    setRescheduleOpen((s) => ({ ...s, [n]: !s[n] }))
    setNewDueDate((s) => ({ ...s, [n]: s[n] ?? isoToDateOnly(installment.dueDate) }))
    setRescheduleReason((s) => ({ ...s, [n]: s[n] ?? "" }))

    // opcional: fecha o outro form quando abre este
    setPayFormOpen((s) => ({ ...s, [n]: false }))
  }

  async function handleCreatePartialPayment(args: {
    ownerId: string
    purchaseId: string
    installmentNumber: number
  }) {
    const n = args.installmentNumber
    const paidAt = (payDate[n] ?? "").trim()
    const amountCents = Number(payAmountCents[n] ?? 0)

    if (!paidAt) return
    if (!Number.isFinite(amountCents) || amountCents <= 0) return

    await createPayment.mutateAsync({
      ownerId: args.ownerId,
      purchaseId: args.purchaseId,
      installmentNumber: n,
      input: {
        paidAt,
        amountCents,
        note: (payNote[n] ?? "").trim() || undefined,
      },
    })

    setPayFormOpen((s) => ({ ...s, [n]: false }))
  }

  async function handleReschedule(args: {
    ownerId: string
    purchaseId: string
    installmentNumber: number
  }) {
    const n = args.installmentNumber
    const dueDate = (newDueDate[n] ?? "").trim()
    if (!dueDate) return

    await reschedule.mutateAsync({
      ownerId: args.ownerId,
      purchaseId: args.purchaseId,
      installmentNumber: n,
      input: {
        dueDate,
        reason: (rescheduleReason[n] ?? "").trim() || undefined,
      },
    })

    setRescheduleOpen((s) => ({ ...s, [n]: false }))
  }

  const orangeSelected =
    "bg-orange-500 text-white border-orange-500 hover:bg-orange-600 hover:border-orange-600"

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) {
          setSelectedPurchaseId(null)
          setPayFormOpen({})
          setRescheduleOpen({})
          setPayAmountCents({})
          setPayDate({})
          setPayNote({})
          setNewDueDate({})
          setRescheduleReason({})
        }
      }}
    >
      {/* ✅ modal com scroll */}
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden">
        <div className="flex max-h-[85vh] flex-col">
          <div className="p-6 pb-3">
            <DialogHeader>
              <DialogTitle>Pagamentos</DialogTitle>
              <DialogDescription>
                {loadingRow ? (
                  "Carregando pagamentos…"
                ) : row ? (
                  <>
                    Controle financeiro do expositor{" "}
                    <span className="font-medium text-foreground">
                      {row.owner.fullName ?? "—"}
                    </span>
                    .
                  </>
                ) : (
                  "Selecione um expositor para ver os pagamentos."
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <Separator />

          <ScrollArea className="overflow-auto h-[100vh]">
            <div className="p-6 space-y-4">
              {!ownerFairId ? (
                <div className="py-8 text-sm text-muted-foreground">
                  Nenhum expositor selecionado.
                </div>
              ) : loadingRow ? (
                <div className="py-8 text-sm text-muted-foreground">Carregando…</div>
              ) : !row ? (
                <div className="py-8 text-sm text-muted-foreground">
                  Não foi possível localizar este expositor na lista.
                </div>
              ) : purchases.length === 0 ? (
                <div className="py-8 text-sm text-muted-foreground">
                  Este expositor ainda não possui compras/parcelas configuradas.
                </div>
              ) : (
                <>
                  {/* Resumo agregado */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Resumo geral</div>
                      <div className="text-xs text-muted-foreground">
                        Total:{" "}
                        <span className="font-medium text-foreground">
                          {formatMoneyBRLFromCents(row.payment?.totalCents ?? null)}
                        </span>{" "}
                        · Pago:{" "}
                        <span className="font-medium text-foreground">
                          {formatMoneyBRLFromCents(row.payment?.paidCents ?? null)}
                        </span>{" "}
                        · Compras:{" "}
                        <span className="font-medium text-foreground">
                          {row.payment?.purchasesCount ?? purchases.length}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        planStatusTone(row.payment?.status ?? null),
                      )}
                    >
                      {paymentStatusLabel(row.payment?.status ?? null)}
                    </Badge>
                  </div>

                  {/* Seletor de compra */}
                  <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 pt-3 pb-2 bg-muted/20">
                      <div className="text-sm font-medium">Compras</div>
                      <div className="text-xs text-muted-foreground">
                        Selecione a compra para ver as parcelas.
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex flex-wrap gap-2">
                      {purchases.map((p) => {
                        const active = p.purchaseId === selectedPurchaseId
                        return (
                          <button
                            key={p.purchaseId}
                            type="button"
                            onClick={() => setSelectedPurchaseId(p.purchaseId)}
                            className={cn(
                              "rounded-full cursor-pointer border px-3 py-1 text-xs font-medium inline-flex items-center gap-2 transition",
                              active
                                ? orangeSelected
                                : "bg-background hover:bg-muted/95",
                            )}
                          >
                            <Receipt className="h-3.5 w-3.5 opacity-70" />
                            <span>{stallSizeLabel(p.stallSize)}</span>
                            <span className="tabular-nums">
                              {p.paidCount}/{p.installmentsCount}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {!selectedPurchase ? (
                    <div className="py-6 text-sm text-muted-foreground">
                      Selecione uma compra para ver as parcelas.
                    </div>
                  ) : (
                    <div className="rounded-xl border">
                      <div className="px-4 py-3 bg-muted/20 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <Badge variant="outline" className="text-[10px] mb-2">
                            {stallSizeLabel(selectedPurchase.stallSize)}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-medium",
                              planStatusTone(selectedPurchase.status),
                            )}
                          >
                            {paymentStatusLabel(selectedPurchase.status)}
                          </Badge>

                          <div className="text-xs text-muted-foreground">
                            Total:{" "}
                            <span className="font-medium text-foreground">
                              {formatMoneyBRLFromCents(selectedPurchase.totalCents)}
                            </span>{" "}
                            · Pago:{" "}
                            <span className="font-medium text-foreground">
                              {formatMoneyBRLFromCents(selectedPurchase.paidCents)}
                            </span>{" "}
                            · Parcelas:{" "}
                            <span className="font-medium text-foreground">
                              {selectedPurchase.paidCount}/{selectedPurchase.installmentsCount}
                            </span>{" "}
                            · Próxima:{" "}
                            <span className="font-medium text-foreground">
                              {formatDateBR(selectedPurchase.nextDueDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lista de parcelas */}
                      <div className="p-4 space-y-3">
                        {selectedPurchase.installments.map((i) => {
                          const s = getInstallmentState({
                            dueDate: i.dueDate,
                            paidAt: i.paidAt,
                          })
                          const tone = installmentCardTone(s.state)

                          const paidAmount = i.paidAmountCents ?? (i.paidAt ? i.amountCents : 0)
                          const remaining = Math.max(0, i.amountCents - (i.paidAmountCents ?? 0))

                          const canAct = !isBusy && !!row.owner.id

                          const isPaySelected = !!payFormOpen[i.number]
                          const isResSelected = !!rescheduleOpen[i.number]

                          return (
                            <div
                              key={i.id}
                              className={cn(
                                "rounded-xl border p-4 transition hover:shadow-sm",
                                tone.wrap,
                              )}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2">
                                    {tone.icon}
                                    <div className="text-sm font-semibold">
                                      Parcela {i.number}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "rounded-full px-2 py-0.5 text-[11px]",
                                        tone.badge,
                                      )}
                                    >
                                      {tone.label}
                                    </Badge>
                                  </div>

                                  <div className="text-xs text-muted-foreground">
                                    Venc.:{" "}
                                    <span className="text-foreground font-medium">
                                      {formatDateBR(i.dueDate)}
                                    </span>{" "}
                                    · Valor:{" "}
                                    <span className="text-foreground font-medium">
                                      {formatMoneyBRLFromCents(i.amountCents)}
                                    </span>
                                    {i.paidAt ? (
                                      <>
                                        {" "}
                                        · Quitada em:{" "}
                                        <span className="text-foreground font-medium">
                                          {formatDateBR(i.paidAt)}
                                        </span>
                                      </>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 sm:justify-end">
                                  <div className="text-right text-xs text-muted-foreground">
                                    <div>Pago:</div>
                                    <div className="text-foreground font-semibold">
                                      {formatMoneyBRLFromCents(paidAmount)}
                                    </div>
                                  </div>

                                  {i.paidAt ? (
                                    <Button
                                      size="sm"
                                      className="w-28 bg-red-500 hover:bg-red-700"
                                      disabled={!canAct}
                                      onClick={() =>
                                        undoInstallmentPaid(
                                          row.owner.id,
                                          selectedPurchase.purchaseId,
                                          i.number,
                                        )
                                      }
                                    >
                                      Desfazer
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="w-28 bg-green-500 hover:bg-green-700"
                                      disabled={!canAct}
                                      onClick={() =>
                                        confirmInstallmentPaid(
                                          row.owner.id,
                                          selectedPurchase.purchaseId,
                                          i.number,
                                        )
                                      }
                                    >
                                      Quitar
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Ações (com destaque laranja quando selecionado) */}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isPaySelected ? "default" : "outline"}
                                  className={cn(isPaySelected ? orangeSelected : "")}
                                  disabled={!canAct}
                                  onClick={() => togglePayForm(i.number)}
                                >
                                  <Receipt className="h-4 w-4 mr-2" />
                                  Registrar pagamento
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isResSelected ? "default" : "outline"}
                                  className={cn(isResSelected ? orangeSelected : "")}
                                  disabled={!canAct}
                                  onClick={() => toggleReschedule(i.number, i)}
                                >
                                  <CalendarClock className="h-4 w-4 mr-2" />
                                  Reprogramar vencimento
                                </Button>
                              </div>

                              {/* Form: pagamento parcial */}
                              {isPaySelected ? (
                                <div className="mt-3 rounded-lg border bg-background p-3 space-y-3">
                                  <div className="text-xs text-muted-foreground">
                                    Restante (estimado):{" "}
                                    <span className="font-medium text-foreground">
                                      {formatMoneyBRLFromCents(remaining)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium">Data</div>
                                      <Input
                                        type="date"
                                        value={payDate[i.number] ?? ""}
                                        disabled={!canAct}
                                        onChange={(e) =>
                                          setPayDate((s) => ({
                                            ...s,
                                            [i.number]: e.target.value,
                                          }))
                                        }
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <div className="text-xs font-medium">Valor (R$)</div>
                                      <UnitPriceInput
                                        valueCents={payAmountCents[i.number] ?? 0}
                                        disabled={!canAct}
                                        onChangeCents={(cents) =>
                                          setPayAmountCents((s) => ({
                                            ...s,
                                            [i.number]: cents,
                                          }))
                                        }
                                      />
                                    </div>


                                  </div>

                                  <div className="space-y-1">
                                    <div className="text-xs font-medium">Observação (opcional)</div>
                                    <Textarea
                                      value={payNote[i.number] ?? ""}
                                      disabled={!canAct}
                                      onChange={(e) =>
                                        setPayNote((s) => ({
                                          ...s,
                                          [i.number]: e.target.value,
                                        }))
                                      }
                                      placeholder='Ex.: "negociado, prorrogado", "pix", etc'
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <Button
                                      className="w-full bg-orange-500 hover:bg-orange-600"
                                      disabled={!canAct}
                                      onClick={() =>
                                        handleCreatePartialPayment({
                                          ownerId: row.owner.id,
                                          purchaseId: selectedPurchase.purchaseId,
                                          installmentNumber: i.number,
                                        })
                                      }
                                    >
                                      Salvar
                                    </Button>
                                  </div>
                                </div>
                              ) : null}

                              {/* Form: reagendar vencimento */}
                              {isResSelected ? (
                                <div className="mt-3 rounded-lg border bg-background p-3 space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium">Novo vencimento</div>
                                      <Input
                                        type="date"
                                        value={newDueDate[i.number] ?? ""}
                                        disabled={!canAct}
                                        onChange={(e) =>
                                          setNewDueDate((s) => ({
                                            ...s,
                                            [i.number]: e.target.value,
                                          }))
                                        }
                                      />
                                    </div>

                                    <div className="sm:col-span-2 space-y-1">
                                      <div className="text-xs font-medium">Motivo (opcional)</div>
                                      <Input
                                        value={rescheduleReason[i.number] ?? ""}
                                        disabled={!canAct}
                                        onChange={(e) =>
                                          setRescheduleReason((s) => ({
                                            ...s,
                                            [i.number]: e.target.value,
                                          }))
                                        }
                                        placeholder='Ex.: "acordo com o expositor"'
                                      />
                                    </div>
                                  </div>

                                  <Button
                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                    disabled={!canAct}
                                    onClick={() =>
                                      handleReschedule({
                                        ownerId: row.owner.id,
                                        purchaseId: selectedPurchase.purchaseId,
                                        installmentNumber: i.number,
                                      })
                                    }
                                  >
                                    Salvar novo vencimento
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {settle.isError || createPayment.isError || reschedule.isError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      Não foi possível atualizar os pagamentos. Verifique o backend e tente novamente.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
