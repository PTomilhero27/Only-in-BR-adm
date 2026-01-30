"use client"

/**
 * Modal: Pagamentos do expositor na feira.
 * Responsabilidade:
 * - Exibir resumo e lista de parcelas (número, vencimento, valor, pago/em aberto)
 * - Permitir marcar como paga / desmarcar como paga (ação por parcela)
 *
 * Fix desta iteração:
 * - O modal NÃO deve depender da "row" passada por props (pode ficar stale).
 * - Ele recebe `ownerFairId` e busca a row atual no cache da listagem da feira.
 * - Assim, após mutate + invalidate, o modal atualiza sozinho.
 */

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

import { useSettleInstallmentsMutation, useFairExhibitorsQuery } from "@/app/modules/fairs/exhibitors/exhibitors.queries"
import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import { CheckCircle2, AlertTriangle, Clock3 } from "lucide-react"

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

/**
 * Compara apenas a data (ignora hora) para evitar timezone quebrar o status.
 * Regra:
 * - overdue: dueDate < hoje
 * - due: dueDate >= hoje (inclui hoje e futuro)
 */
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

function planStatusLabel(status?: string | null) {
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

  /** ✅ em vez de passar row inteira (stale), passamos a chave */
  ownerFairId: string | null

  fairId: string
}

export function ExhibitorPaymentsDialog({ open, onOpenChange, ownerFairId, fairId }: Props) {
  const settle = useSettleInstallmentsMutation(fairId)

  // ✅ pega dados atuais da feira (cache) e acha a row atual
  const exhibitorsQuery = useFairExhibitorsQuery(fairId)

  const row: FairExhibitorRow | null = React.useMemo(() => {
    if (!ownerFairId) return null
    const items = exhibitorsQuery.data?.items ?? []
    return items.find((i) => i.ownerFairId === ownerFairId) ?? null
  }, [exhibitorsQuery.data?.items, ownerFairId])

  const installments = row?.payment?.installments ?? []
  const planStatus = row?.payment?.status ?? null
  const isBusy = settle.isPending

  async function confirmInstallmentPayment(ownerId: string, number: number) {
    await settle.mutateAsync({
      ownerId,
      input: { action: "SET_PAID", numbers: [number] },
    })
    // ✅ não precisa setState aqui; invalidate já atualiza a row no cache
  }

  async function undoInstallmentPayment(ownerId: string, number: number) {
    await settle.mutateAsync({
      ownerId,
      input: { action: "SET_UNPAID", numbers: [number] },
    })
  }

  const loadingRow = open && ownerFairId && exhibitorsQuery.isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Pagamentos</DialogTitle>
          <DialogDescription>
            {loadingRow ? (
              "Carregando pagamentos…"
            ) : row ? (
              <>
                Controle das parcelas do expositor{" "}
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

        <Separator />

        {!ownerFairId ? (
          <div className="py-8 text-sm text-muted-foreground">Nenhum expositor selecionado.</div>
        ) : loadingRow ? (
          <div className="py-8 text-sm text-muted-foreground">Carregando…</div>
        ) : !row ? (
          <div className="py-8 text-sm text-muted-foreground">
            Não foi possível localizar este expositor na lista.
          </div>
        ) : !row.payment ? (
          <div className="py-8 text-sm text-muted-foreground">
            Este expositor ainda não possui plano de pagamento configurado.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo do plano */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-sm font-medium">Resumo do plano</div>
                <div className="text-xs text-muted-foreground">
                  Total:{" "}
                  <span className="font-medium text-foreground">
                    {formatMoneyBRLFromCents(row.payment.totalCents)}
                  </span>{" "}
                  · Parcelas:{" "}
                  <span className="font-medium text-foreground">
                    {row.payment.paidCount}/{row.payment.installmentsCount}
                  </span>{" "}
                  · Próxima:{" "}
                  <span className="font-medium text-foreground">
                    {formatDateBR(row.payment.nextDueDate ?? null)}
                  </span>
                </div>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  planStatusTone(planStatus),
                )}
              >
                {planStatusLabel(planStatus)}
              </Badge>
            </div>

            {/* Lista */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-muted/20">
                <div className="text-sm font-medium">Parcelas</div>
                <div className="text-xs text-muted-foreground">
                  Verde: paga · Laranja: em aberto · Vermelho: atrasada
                </div>
              </div>

              <ScrollArea className="max-h-[420px]">
                <div className="p-4 space-y-3">
                  {installments.map((i) => {
                    const s = getInstallmentState({ dueDate: i.dueDate, paidAt: i.paidAt })
                    const tone = installmentCardTone(s.state)

                    const paidAmount =
                      i.paidAmountCents ?? (i.paidAt ? i.amountCents : null)

                    const actionDisabled = isBusy || !row?.owner?.id

                    return (
                      <div
                        key={i.number}
                        className={cn(
                          "rounded-xl border p-4 transition",
                          "hover:shadow-sm",
                          tone.wrap,
                        )}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          {/* Esquerda */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              {tone.icon}
                              <div className="text-sm font-semibold">Parcela {i.number}</div>
                              <Badge
                                variant="outline"
                                className={cn("rounded-full px-2 py-0.5 text-[11px]", tone.badge)}
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
                                  · Pago em:{" "}
                                  <span className="text-foreground font-medium">
                                    {formatDateBR(i.paidAt)}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {/* Direita */}
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
                                className="w-24 bg-red-500 hover:bg-red-700"
                                disabled={actionDisabled}
                                onClick={() => undoInstallmentPayment(row.owner.id, i.number)}
                              >
                                Cancelar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="w-24 bg-green-500 hover:bg-green-700"
                                disabled={actionDisabled}
                                onClick={() => confirmInstallmentPayment(row.owner.id, i.number)}
                              >
                                Confirmar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {installments.length === 0 && (
                    <div className="py-8 text-sm text-muted-foreground">
                      Nenhuma parcela encontrada neste plano.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Erros da mutation */}
            {settle.isError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Não foi possível atualizar as parcelas. Verifique o backend e tente novamente.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
