'use client'

import React, { useMemo, useState } from 'react'
import { CalendarDays, Link2, X, ShoppingCart, Pencil } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

import type { InterestListItem } from '@/app/modules/interests/interests.schema'
import {
  useInterestFairsQuery,
  useLinkInterestToFairMutation,
  useUnlinkInterestFromFairMutation,
  usePatchOwnerFairPurchasesMutation,
} from '@/app/modules/interest-fairs/interest-fairs.queries'

import { useFairsQuery } from '@/app/modules/fairs/hooks/use-fairs-query'
import type { Fair } from '@/app/modules/fairs/types'

import { toast } from '@/components/ui/toast'
import { getErrorMessage } from '@/app/shared/utils/get-error-message'

import { LinkedFairItem } from './linked-fair-item'
import { ConfirmUnlinkDialog } from './confirm-unlink-dialog'
import { FairPicker } from './fair-picker'

import {
  PurchasedStallsEditor,
  type PurchasedStallDraft,
} from './purchased-stalls-editor'

import type {
  LinkInterestToFairInput,
  PatchOwnerFairPurchasesInput,
} from '@/app/modules/interest-fairs/interest-fairs.schema'

function buildEmptyPurchase(): PurchasedStallDraft {
  return {
    clientId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    stallSize: 'SIZE_3X3',
    unitPriceCents: 0,
    paidUpfrontCents: 0,
    installmentsCount: 0,
    installments: [],
  }
}

/**
 * Converte drafts (UI) para purchases (API) no formato 1 por 1.
 * - Cada draft = 1 linha de compra (qty = 1 no backend)
 */
function mapDraftsToPurchasesPayload(
  drafts: PurchasedStallDraft[],
): LinkInterestToFairInput['purchases'] {
  return drafts.map((d) => ({
    stallSize: d.stallSize,
    unitPriceCents: d.unitPriceCents ?? 0,
    paidCents: d.paidUpfrontCents ?? 0,
    installmentsCount: d.installmentsCount ?? 0,
    installments:
      (d.installmentsCount ?? 0) > 0
        ? (d.installments ?? []).map((i) => ({
            number: i.number,
            dueDate: i.dueDate,
            amountCents: i.amountCents,
          }))
        : [],
  }))
}

/**
 * Converte purchases retornadas pelo backend em drafts para editar na UI.
 *
 * Observação:
 * - Se vier qty > 1 (legado), expandimos em várias linhas.
 * - paidCents: quando qty > 1, dividimos (melhor esforço).
 */
function mapApiPurchasesToDrafts(
  purchases: Array<{
    stallSize: any
    qty: number
    unitPriceCents: number
    paidCents: number
    installmentsCount: number
    installments: Array<{ number: number; dueDate: string; amountCents: number }>
  }>,
): PurchasedStallDraft[] {
  const drafts: PurchasedStallDraft[] = []

  for (const p of purchases) {
    const qty = Math.max(1, Number(p.qty ?? 1))

    for (let i = 0; i < qty; i++) {
      drafts.push({
        clientId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        stallSize: p.stallSize,
        unitPriceCents: p.unitPriceCents ?? 0,
        paidUpfrontCents: qty === 1 ? (p.paidCents ?? 0) : Math.floor((p.paidCents ?? 0) / qty),
        installmentsCount: p.installmentsCount ?? 0,
        installments:
          (p.installmentsCount ?? 0) > 0
            ? (p.installments ?? []).map((ins) => ({
                clientId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                number: ins.number,
                dueDate: ins.dueDate,
                amountCents: ins.amountCents,
              }))
            : [],
      })
    }
  }

  return drafts.length ? drafts : [buildEmptyPurchase()]
}

/**
 * Tab de Feiras do interessado (Admin).
 *
 * Responsabilidade:
 * - Listar vínculos existentes
 * - Criar vínculo + compras (linhas)
 * - Editar compras (PATCH replace)
 * - Remover vínculo
 */
export function InterestFairsTab({ interest }: { interest: InterestListItem }) {
  const ownerId = interest.id

  const linksQuery = useInterestFairsQuery(ownerId)
  const fairsQuery = useFairsQuery({ status: 'ATIVA' })

  const linkMutation = useLinkInterestToFairMutation(ownerId)
  const unlinkMutation = useUnlinkInterestFromFairMutation(ownerId)

  const items = linksQuery.data?.items ?? []
  const fairs = fairsQuery.data ?? []

  // ---------- create ----------
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFair, setSelectedFair] = useState<Fair | null>(null)

  // ---------- shared editor state (create/edit) ----------
  const [purchases, setPurchases] = useState<PurchasedStallDraft[]>([buildEmptyPurchase()])
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  // ---------- edit ----------
  const [editOpen, setEditOpen] = useState(false)
  const [editingFair, setEditingFair] = useState<{ fairId: string; fairName: string } | null>(null)

  const patchPurchasesMutation = usePatchOwnerFairPurchasesMutation(ownerId, editingFair?.fairId ?? '')

  // ---------- remove ----------
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<{ fairId: string; fairName: string } | null>(null)

  const busy =
    linksQuery.isLoading ||
    fairsQuery.isLoading ||
    linkMutation.isPending ||
    unlinkMutation.isPending ||
    patchPurchasesMutation.isPending

  function resetEditorState() {
    setPurchases([buildEmptyPurchase()])
    setPurchaseError(null)
  }

  function openCreate() {
    setCreateOpen(true)
    setEditOpen(false)
    setEditingFair(null)

    setSearch('')
    setSelectedFair(null)
    resetEditorState()
  }

  function closeCreate() {
    setCreateOpen(false)
    setSearch('')
    setSelectedFair(null)
    resetEditorState()
  }

  function openEdit(it: any) {
    // ✅ bloqueio: não editar se já consumiu compras
    const usedQtyTotal = (it.purchases ?? []).reduce(
      (acc: number, p: any) => acc + (p.usedQty ?? 0),
      0,
    )
    if (usedQtyTotal > 0) {
      toast.error({
        title: 'Edição bloqueada',
        subtitle: 'Não é possível editar compras após vincular barracas à feira.',
      })
      return
    }

    setEditOpen(true)
    setCreateOpen(false)
    setSelectedFair(null)
    setSearch('')

    setEditingFair({ fairId: it.fairId, fairName: it.fairName })
    setPurchases(mapApiPurchasesToDrafts(it.purchases ?? []))
    setPurchaseError(null)
  }

  function closeEdit() {
    setEditOpen(false)
    setEditingFair(null)
    resetEditorState()
  }

  const canSubmitCreate = useMemo(() => {
    if (!selectedFair) return false
    if (purchaseError) return false
    if (!purchases?.length) return false
    return true
  }, [selectedFair, purchaseError, purchases])

  const canSubmitEdit = useMemo(() => {
    if (!editingFair) return false
    if (purchaseError) return false
    if (!purchases?.length) return false
    return true
  }, [editingFair, purchaseError, purchases])

  async function submitCreate() {
    if (!selectedFair) return

    if (purchaseError) {
      toast.error({ title: 'Revise as barracas', subtitle: purchaseError })
      return
    }

    try {
      const purchasesPayload = mapDraftsToPurchasesPayload(purchases)

      await linkMutation.mutateAsync({
        fairId: selectedFair.id,
        purchases: purchasesPayload,
      })

      toast.success({
        title: 'Vínculo criado',
        subtitle: `Interessado vinculado à feira "${selectedFair.name}" e compras registradas.`,
      })

      closeCreate()
    } catch (err) {
      toast.error({
        title: 'Erro ao salvar',
        subtitle: getErrorMessage(err),
      })
    }
  }

  async function submitEdit() {
    if (!editingFair) return

    if (purchaseError) {
      toast.error({ title: 'Revise as barracas', subtitle: purchaseError })
      return
    }

    try {
      const purchasesPayload = mapDraftsToPurchasesPayload(purchases)

      const input: PatchOwnerFairPurchasesInput = {
        purchases: purchasesPayload,
      }

      await patchPurchasesMutation.mutateAsync(input)

      toast.success({
        title: 'Compras atualizadas',
        subtitle: `Compras da feira "${editingFair.fairName}" foram atualizadas.`,
      })

      closeEdit()
    } catch (err) {
      toast.error({
        title: 'Erro ao salvar edição',
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


          {linksQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando vínculos…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma feira vinculada.</div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => {
                const usedQtyTotal = (it.purchases ?? []).reduce(
                  (acc: number, p: any) => acc + (p.usedQty ?? 0),
                  0,
                )
                const canEdit = usedQtyTotal === 0

                return (
                  <LinkedFairItem
                    key={it.fairId}
                    fairId={it.fairId}
                    fairName={it.fairName}
                    stallsQty={it.stallsQty ?? 0}
                    status={it.status ?? 'SELECIONADO'}
                    busy={busy}
                    canEdit={canEdit}
                    onEdit={() => openEdit(it)}
                    onRemove={() => askRemove(it.fairId, it.fairName)}
                  />
                )
              })}
            </div>
          )}

          <Separator />

          {/* ---------- Botão criar vínculo ---------- */}
          {!createOpen && !editOpen ? (
            <Button className="gap-2 rounded-xl" onClick={openCreate} disabled={busy}>
              <Link2 className="h-4 w-4" />
              Vincular a uma feira
            </Button>
          ) : null}

          {/* ---------- Create ---------- */}
          {createOpen ? (
            <div className="rounded-2xl border bg-muted/30 p-4 space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Novo vínculo</div>
                  <div className="text-xs text-muted-foreground">
                    1) Selecione a feira ativa
                    <br />
                    2) Configure as barracas compradas (tamanho/valores/parcelas)
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
                  selected={selectedFair}
                  onSelect={(f) => setSelectedFair(f)}
                  onClear={() => setSelectedFair(null)}
                  busy={busy}
                  search={search}
                  setSearch={setSearch}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  Barracas compradas (1 por 1)
                </div>

                <PurchasedStallsEditor
                  value={purchases}
                  onChange={setPurchases}
                  disabled={busy}
                  error={purchaseError}
                  onErrorChange={setPurchaseError}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={closeCreate} disabled={busy}>
                  Cancelar
                </Button>

                <Button
                  onClick={submitCreate}
                  disabled={busy || !canSubmitCreate}
                  className="gap-2 rounded-xl"
                  title={purchaseError ?? undefined}
                >
                  <Link2 className="h-4 w-4" />
                  Salvar vínculo
                </Button>
              </div>

              {purchaseError ? <p className="text-xs text-destructive">{purchaseError}</p> : null}
            </div>
          ) : null}

          {/* ---------- Edit ---------- */}
          {editOpen && editingFair ? (
            <div className="rounded-2xl border bg-muted/30 p-4 space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Editar compras
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Feira: <b>{editingFair.fairName}</b>
                    <br />
                    Ajuste tamanho/valores/parcelas e salve.
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeEdit}
                  title="Cancelar edição"
                  disabled={busy}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  Barracas compradas (1 por 1)
                </div>

                <PurchasedStallsEditor
                  value={purchases}
                  onChange={setPurchases}
                  disabled={busy}
                  error={purchaseError}
                  onErrorChange={setPurchaseError}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={closeEdit} disabled={busy}>
                  Cancelar
                </Button>

                <Button
                  onClick={submitEdit}
                  disabled={busy || !canSubmitEdit}
                  className="gap-2 rounded-xl"
                  title={purchaseError ?? undefined}
                >
                  <Pencil className="h-4 w-4" />
                  Salvar alterações
                </Button>
              </div>

              {purchaseError ? <p className="text-xs text-destructive">{purchaseError}</p> : null}
            </div>
          ) : null}
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
