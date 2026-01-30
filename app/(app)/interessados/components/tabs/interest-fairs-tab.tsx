'use client'

import React, { useMemo, useState } from 'react'
import { CalendarDays, Link2, X } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import type { InterestListItem } from '@/app/modules/interests/interests.schema'
import {
  useInterestFairsQuery,
  useLinkInterestToFairMutation,
  useUnlinkInterestFromFairMutation,
  useUpdateInterestFairMutation,
} from '@/app/modules/interest-fairs/interest-fairs.queries'
import { useFairsQuery } from '@/app/modules/fairs/hooks/use-fairs-query'
import type { Fair } from '@/app/modules/fairs/types'

import { toast } from '@/components/ui/toast'
import { getErrorMessage } from '@/app/shared/utils/get-error-message'

import {
  OwnerFairStallSlotInput,
  PaymentPlanForm,
  PaymentInstallmentForm,
  sumSlotsQty,
  sumSlotsTotalCents,
  useOwnerFairLinkForm,
  makeClientId,
} from '@/app/modules/interest-fairs/hooks/use-owner-fair-link-form'

import { LinkedFairItem } from '../linked-fair-item'
import { StallSlotsEditor } from '../stall-slots-editor'
import { PaymentPlanEditor } from '../payment-plan-editor'
import { LinkSummaryCard } from '../link-summary-card'
import { FairPicker } from '../fair-picker'
import { ConfirmUnlinkDialog } from '../confirm-unlink-dialog'

/**
 * Converte slots recebidos da API para o formato do form (com clientId).
 */
function slotsFromApi(
  currentQty: number,
  currentSlots?: Array<{ stallSize: string; qty: number; unitPriceCents: number }>,
): OwnerFairStallSlotInput[] {
  if (currentSlots && currentSlots.length > 0) {
    return currentSlots.map((s) => ({
      clientId: makeClientId(),
      stallSize: (s.stallSize as any) ?? 'SIZE_3X3',
      qty: Number.isFinite(s.qty) ? s.qty : 1,
      unitPriceCents: Number.isFinite(s.unitPriceCents) ? s.unitPriceCents : 0,
    }))
  }

  return [
    {
      clientId: makeClientId(),
      stallSize: 'SIZE_3X3',
      qty: currentQty || 1,
      unitPriceCents: 0,
    },
  ]
}

function todayIsoDate(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Gera plano default bem-formado.
 * IMPORTANTÍSSIMO:
 * - dueDate não pode ficar vazio, senão você trava a validação ao salvar.
 */
function defaultPaymentPlanForSlots(slots: OwnerFairStallSlotInput[]): PaymentPlanForm {
  const totalCents = sumSlotsTotalCents(slots)
  return {
    installmentsCount: 1,
    totalCents,
    installments: [
      {
        clientId: makeClientId(),
        number: 1,
        dueDate: todayIsoDate(),
        amountCents: totalCents,
        paidAt: null,
        paidAmountCents: null,
      },
    ],
  }
}

/**
 * Converte paymentPlan vindo da API para PaymentPlanForm do front.
 * - adiciona clientId
 * - garante strings date-only
 * - garante paidAt/paidAmountCents
 */
function paymentPlanFromApiToForm(input: any, fallbackTotalCents: number): PaymentPlanForm {
  const raw = input && typeof input === 'object' ? input : null
  if (!raw) {
    return {
      installmentsCount: 1,
      totalCents: fallbackTotalCents,
      installments: [
        {
          clientId: makeClientId(),
          number: 1,
          dueDate: todayIsoDate(),
          amountCents: fallbackTotalCents,
          paidAt: null,
          paidAmountCents: null,
        },
      ],
    }
  }

  const installmentsCount = Number.isFinite(raw.installmentsCount) ? Number(raw.installmentsCount) : 1
  const totalCents = Number.isFinite(raw.totalCents) ? Number(raw.totalCents) : fallbackTotalCents

  const installments: PaymentInstallmentForm[] = Array.isArray(raw.installments)
    ? raw.installments.map((i: any, idx: number) => {
        const number = Number.isFinite(i?.number) ? Number(i.number) : idx + 1
        const dueDate = typeof i?.dueDate === 'string' && i.dueDate ? i.dueDate : todayIsoDate()
        const amountCents = Number.isFinite(i?.amountCents) ? Number(i.amountCents) : 0

        const paidAt =
          i?.paidAt === null ? null : typeof i?.paidAt === 'string' ? i.paidAt : null

        const paidAmountCents =
          i?.paidAmountCents === null
            ? null
            : Number.isFinite(i?.paidAmountCents)
              ? Number(i.paidAmountCents)
              : null

        return {
          clientId: makeClientId(),
          number,
          dueDate,
          amountCents,
          paidAt,
          paidAmountCents,
        }
      })
    : []

  // fallback seguro se veio vazio
  if (installments.length === 0) {
    return defaultPaymentPlanForSlots([
      { clientId: makeClientId(), stallSize: 'SIZE_3X3', qty: 1, unitPriceCents: totalCents },
    ])
  }

  return {
    installmentsCount,
    totalCents,
    installments,
  }
}

export function InterestFairsTab({ interest }: { interest: InterestListItem }) {
  const ownerId = interest.id

  const linksQuery = useInterestFairsQuery(ownerId)
  const fairsQuery = useFairsQuery({ status: 'ATIVA' })

  const linkMutation = useLinkInterestToFairMutation(ownerId)
  const updateMutation = useUpdateInterestFairMutation(ownerId)
  const unlinkMutation = useUnlinkInterestFromFairMutation(ownerId)

  const items = (linksQuery.data?.items ?? []) as any[]
  const fairs = fairsQuery.data ?? []

  const busy =
    linksQuery.isLoading ||
    fairsQuery.isLoading ||
    linkMutation.isPending ||
    updateMutation.isPending ||
    unlinkMutation.isPending

  // -----------------------------
  // NOVO VÍNCULO (CREATE)
  // -----------------------------
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  const createForm = useOwnerFairLinkForm()

  // -----------------------------
  // EDIT VÍNCULO (UPDATE)
  // -----------------------------
  const [editingFairId, setEditingFairId] = useState<string | null>(null)
  const editForm = useOwnerFairLinkForm()

  // -----------------------------
  // CONFIRMAÇÃO REMOÇÃO
  // -----------------------------
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<{ fairId: string; fairName: string } | null>(
    null,
  )

  const fairsById = useMemo(() => {
    const map = new Map<string, Fair>()
    for (const f of fairs) map.set(f.id, f)
    return map
  }, [fairs])

  function openCreate() {
    setEditingFairId(null)
    editForm.reset()
    setCreateOpen(true)
  }

  function closeCreate() {
    setCreateOpen(false)
    setSearch('')
    createForm.reset()
  }

  async function submitCreate() {
    if (!createForm.selectedFair) return
    if (!createForm.canSubmit) return

    try {
      await linkMutation.mutateAsync({
        fairId: createForm.selectedFair.id,
        stallSlots: createForm.stallSlots.map(({ clientId, ...rest }) => rest),

        paymentPlan: {
          installmentsCount: createForm.paymentPlan.installmentsCount,
          totalCents: createForm.paymentPlan.totalCents,
          // ✅ manda paidAt/paidAmountCents também
          installments: createForm.paymentPlan.installments.map(({ clientId, ...rest }) => rest),
        },
      } as any)

      toast.success({
        title: 'Vínculo criado',
        subtitle: `Interessado vinculado à feira "${createForm.selectedFair.name}".`,
      })

      closeCreate()
    } catch (err) {
      toast.error({
        title: 'Erro ao vincular',
        subtitle: getErrorMessage(err),
      })
    }
  }

  function startEdit(it: any) {
    setCreateOpen(false)
    createForm.reset()

    setEditingFairId(it.fairId)

    const fair = fairsById.get(it.fairId) ?? null
    const slots = slotsFromApi(it.stallsQty ?? 1, it.stallSlots)
    const slotsTotal = sumSlotsTotalCents(slots)

    // ✅ Converte do formato do backend para o formato do hook (clientId etc)
    const planFromApi: PaymentPlanForm =
      it.paymentPlan && typeof it.paymentPlan === 'object'
        ? paymentPlanFromApiToForm(it.paymentPlan, slotsTotal)
        : defaultPaymentPlanForSlots(slots)

    editForm.setSelectedFair(fair)
    editForm.setStallSlots(slots)

    // ✅ garante consistência imediata com o total dos slots
    editForm.setPaymentPlan({
      ...planFromApi,
      totalCents: slotsTotal,
    })
  }

  function cancelEdit() {
    setEditingFairId(null)
    editForm.reset()
  }

  async function submitEdit(it: any) {
    if (!editingFairId) return
    if (!editForm.selectedFair) return
    if (!editForm.canSubmit) return

    try {
      await updateMutation.mutateAsync({
        fairId: editingFairId,
        input: {
          stallSlots: editForm.stallSlots.map(({ clientId, ...rest }) => rest),

          paymentPlan: {
            installmentsCount: editForm.paymentPlan.installmentsCount,
            totalCents: editForm.paymentPlan.totalCents,
            // ✅ manda paidAt/paidAmountCents também
            installments: editForm.paymentPlan.installments.map(({ clientId, ...rest }) => rest),
          },
        },
      } as any)

      toast.success({
        title: 'Vínculo atualizado',
        subtitle: `Compra/pagamento atualizados em "${it.fairName}".`,
      })

      cancelEdit()
    } catch (err) {
      toast.error({
        title: 'Erro ao atualizar',
        subtitle: getErrorMessage(err),
      })
    }
  }

  function askRemove(fairId: string, fairName: string) {
    setPendingRemove({ fairId, fairName })
    setConfirmOpen(true)
  }

  async function confirmRemove() {
    if (!pendingRemove) return

    try {
      await unlinkMutation.mutateAsync(pendingRemove.fairId)

      toast.success({
        title: 'Vínculo removido',
        subtitle: `Interessado desvinculado da feira "${pendingRemove.fairName}".`,
      })
    } catch (err) {
      toast.error({
        title: 'Erro ao desvincular',
        subtitle: getErrorMessage(err),
      })
    } finally {
      setConfirmOpen(false)
      setPendingRemove(null)
    }
  }

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Feiras vinculadas
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="text-sm text-muted-foreground">
            Gerencie feiras vinculadas, compra de barracas por tamanho e pagamento (parcelas).
          </div>

          {linksQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando vínculos…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma feira vinculada.</div>
          ) : (
            <div className="space-y-2">
              {items.map((it: any) => {
                const isEditing = editingFairId === it.fairId

                return (
                  <LinkedFairItem
                    key={it.fairId}
                    fairId={it.fairId}
                    fairName={it.fairName}
                    stallsQty={it.stallsQty ?? 0}
                    busy={busy}
                    onEdit={() => startEdit(it)}
                    onRemove={() => askRemove(it.fairId, it.fairName)}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <StallSlotsEditor
                          value={editForm.stallSlots}
                          onChange={editForm.setStallSlots}
                          disabled={busy}
                          error={editForm.slotsError}
                          onErrorChange={editForm.setSlotsError}
                        />

                        <PaymentPlanEditor
                          value={editForm.paymentPlan}
                          onChange={editForm.setPaymentPlan}
                          disabled={busy}
                          error={editForm.paymentError}
                        />

                        <LinkSummaryCard
                          fair={editForm.selectedFair}
                          stallsQty={sumSlotsQty(editForm.stallSlots)}
                          totalCents={editForm.totalCents}
                          capacityError={editForm.capacityError}
                        />

                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" onClick={cancelEdit} disabled={busy}>
                            Cancelar
                          </Button>

                          <Button onClick={() => submitEdit(it)} disabled={busy || !editForm.canSubmit}>
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </LinkedFairItem>
                )
              })}
            </div>
          )}

          <Separator />

          {!createOpen ? (
            <Button className="gap-2" onClick={openCreate} disabled={busy}>
              <Link2 className="h-4 w-4" />
              Vincular a uma feira
            </Button>
          ) : (
            <div className="rounded-2xl border bg-muted/30 p-4 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Novo vínculo</div>
                  <div className="text-xs text-muted-foreground">
                    Selecione uma feira ativa, informe compra por tamanho e configure pagamento.
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeCreate}
                  title="Cancelar"
                  disabled={busy}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">Feira ativa</div>

                <FairPicker
                  fairs={fairs}
                  selected={createForm.selectedFair}
                  onSelect={(f) => createForm.setSelectedFair(f)}
                  onClear={() => createForm.setSelectedFair(null)}
                  busy={busy}
                  search={search}
                  setSearch={setSearch}
                />
              </div>

              <StallSlotsEditor
                value={createForm.stallSlots}
                onChange={createForm.setStallSlots}
                disabled={busy}
                error={createForm.slotsError}
                onErrorChange={createForm.setSlotsError}
              />

              <PaymentPlanEditor
                value={createForm.paymentPlan}
                onChange={createForm.setPaymentPlan}
                disabled={busy}
                error={createForm.paymentError}
              />

              <LinkSummaryCard
                fair={createForm.selectedFair}
                stallsQty={createForm.stallsQty}
                totalCents={createForm.totalCents}
                capacityError={createForm.capacityError}
              />

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={closeCreate} disabled={busy}>
                  Cancelar
                </Button>

                <Button
                  onClick={submitCreate}
                  disabled={busy || !createForm.canSubmit}
                  className="gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  Salvar vínculo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmUnlinkDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        busy={unlinkMutation.isPending}
        fairName={pendingRemove?.fairName}
        onCancel={() => {
          setConfirmOpen(false)
          setPendingRemove(null)
        }}
        onConfirm={confirmRemove}
      />
    </>
  )
}
