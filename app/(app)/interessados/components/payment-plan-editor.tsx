'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, Check, RotateCcw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

import type { PaymentPlanForm } from '@/app/modules/interest-fairs/hooks/use-owner-fair-link-form'
import { UnitPriceInput } from './unit-price-input'

/**
 * Normaliza string para o formato aceito pelo <input type="date"> (YYYY-MM-DD).
 */
function normalizeToDateInput(value?: string | null): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10)

  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return ''
}

/**
 * Hoje em YYYY-MM-DD no fuso local (evita UTC do toISOString).
 */
function todayISODateOnly(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Forma do draft local por parcela.
 * Mantém UI estável mesmo se o hook/pai recriar installments.
 */
type InstallmentDraft = {
  dueDate: string // YYYY-MM-DD
  amountCents: number
  paidAt: string | null // YYYY-MM-DD
  paidAmountCents: number | null
}

export const PaymentPlanEditor = React.memo(function PaymentPlanEditor(props: {
  value: PaymentPlanForm
  onChange: (next: PaymentPlanForm) => void
  disabled?: boolean
  error?: string | null
}) {
  const { value, onChange, disabled, error } = props

  /**
   * Draft local por clientId para:
   * - dueDate não “sumir”
   * - paidAt não “voltar” após clicar
   */
  const [draftById, setDraftById] = useState<Record<string, InstallmentDraft>>({})

  /**
   * Controle de sync: não sobrescrever o item que está em edição no momento.
   */
  const editingIdRef = useRef<string | null>(null)

  /**
   * Sincroniza o draft com o value vindo do pai.
   * Se o hook/pai sobrescrever, o draft segura a UI.
   */
  useEffect(() => {
    setDraftById((prev) => {
      const next = { ...prev }
      const currentIds = new Set(value.installments.map((i) => i.clientId))

      for (const ins of value.installments) {
        const id = ins.clientId
        const incoming: InstallmentDraft = {
          dueDate: normalizeToDateInput(ins.dueDate),
          amountCents: Number.isFinite(ins.amountCents) ? ins.amountCents : 0,
          paidAt: ins.paidAt ? normalizeToDateInput(ins.paidAt) : null,
          paidAmountCents:
            typeof ins.paidAmountCents === 'number' ? ins.paidAmountCents : null,
        }

        // Se está editando esse item (focus), não pisa.
        if (editingIdRef.current === id) continue

        // Se não existe, cria.
        if (!next[id]) {
          next[id] = incoming
          continue
        }

        // Atualiza apenas se o pai mudou (mantém consistência)
        // (se o hook estiver reconstruindo, isso evita flicker)
        next[id] = {
          ...next[id],
          ...incoming,
        }
      }

      // Remove drafts de parcelas removidas
      for (const id of Object.keys(next)) {
        if (!currentIds.has(id)) delete next[id]
      }

      return next
    })
  }, [value.installments])

  const paidCount = useMemo(() => {
    return value.installments.reduce((acc, ins) => {
      const draft = draftById[ins.clientId]
      const paid = draft ? !!draft.paidAt : !!ins.paidAt
      return acc + (paid ? 1 : 0)
    }, 0)
  }, [value.installments, draftById])

  const isPaidAll =
    value.installmentsCount > 0 && paidCount === value.installmentsCount

  function updateDraft(id: string, patch: Partial<InstallmentDraft>) {
    setDraftById((prev) => ({
      ...prev,
      [id]: {
        dueDate: prev[id]?.dueDate ?? normalizeToDateInput(value.installments.find((x) => x.clientId === id)?.dueDate),
        amountCents: prev[id]?.amountCents ?? (value.installments.find((x) => x.clientId === id)?.amountCents ?? 0),
        paidAt: prev[id]?.paidAt ?? (value.installments.find((x) => x.clientId === id)?.paidAt ? normalizeToDateInput(value.installments.find((x) => x.clientId === id)?.paidAt) : null),
        paidAmountCents: prev[id]?.paidAmountCents ?? (value.installments.find((x) => x.clientId === id)?.paidAmountCents ?? null),
        ...patch,
      },
    }))
  }

  function commitToParent(id: string, patch: Partial<any>) {
    onChange({
      ...value,
      installments: value.installments.map((x) =>
        x.clientId === id ? { ...x, ...patch } : x,
      ),
    })
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold inline-flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        Pagamento
      </div>

      <div className="rounded-2xl border bg-background/50 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Parcelamento</div>
            <div className="text-xs text-muted-foreground">
              Defina datas e valores e confirme pagamentos conforme ocorrerem.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              Pagas: {paidCount}/{value.installmentsCount}
            </Badge>

            {isPaidAll ? (
              <Badge className="rounded-full bg-green-100 text-green-700">Pago</Badge>
            ) : (
              <Badge className="rounded-full bg-amber-100 text-amber-700">Pendente</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={value.installmentsCount === 1 ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() => onChange({ ...value, installmentsCount: 1 })}
          >
            À vista
          </Button>

          <Button
            type="button"
            variant={value.installmentsCount > 1 ? 'default' : 'outline'}
            disabled={disabled}
            onClick={() =>
              onChange({
                ...value,
                installmentsCount: Math.max(2, value.installmentsCount),
              })
            }
          >
            Parcelado
          </Button>
        </div>

        {value.installmentsCount > 1 ? (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Quantidade de parcelas (1–12)</div>

            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={String(value.installmentsCount)}
              disabled={disabled}
              onChange={(e) => {
                const raw = e.target.value
                if (!/^\d*$/.test(raw)) return
                const next = raw === '' ? 1 : Math.max(1, Math.min(12, Number(raw)))
                onChange({ ...value, installmentsCount: next })
              }}
            />
          </div>
        ) : null}

        <Separator />

        <div className="space-y-3">
          {value.installments.map((ins) => {
            const draft = draftById[ins.clientId] ?? {
              dueDate: normalizeToDateInput(ins.dueDate),
              amountCents: ins.amountCents ?? 0,
              paidAt: ins.paidAt ? normalizeToDateInput(ins.paidAt) : null,
              paidAmountCents: typeof ins.paidAmountCents === 'number' ? ins.paidAmountCents : null,
            }

            const isPaid = !!draft.paidAt

            return (
              <div key={ins.clientId} className="rounded-2xl border bg-background p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Parcela {ins.number}</div>
                    <div className="text-xs text-muted-foreground">{isPaid ? 'Paga' : 'Pendente'}</div>
                  </div>

                  <Badge
                    className={`rounded-full ${
                      isPaid ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isPaid ? 'Paga' : 'Pendente'}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Vencimento</div>

                    <Input
                      type="date"
                      value={draft.dueDate}
                      disabled={disabled}
                      onFocus={() => (editingIdRef.current = ins.clientId)}
                      onBlur={() => {
                        if (editingIdRef.current === ins.clientId) editingIdRef.current = null
                      }}
                      onChange={(e) => {
                        const dueDate = e.target.value // YYYY-MM-DD
                        updateDraft(ins.clientId, { dueDate })
                        commitToParent(ins.clientId, { dueDate })
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Valor</div>

                    <UnitPriceInput
                      valueCents={draft.amountCents}
                      disabled={disabled}
                      onChangeCents={(amountCents) => {
                        updateDraft(ins.clientId, { amountCents })
                        commitToParent(ins.clientId, { amountCents })
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  {!isPaid ? (
                    <Button
                      type="button"
                      className="w-full gap-2 rounded-xl"
                      disabled={disabled}
                      onClick={() => {
                        const paidAt = todayISODateOnly()
                        const paidAmountCents = draft.amountCents

                        // ✅ UI imediata
                        updateDraft(ins.clientId, { paidAt, paidAmountCents })

                        // ✅ persiste no estado do pai
                        commitToParent(ins.clientId, { paidAt, paidAmountCents })
                      }}
                    >
                      <Check className="h-4 w-4" />
                      Confirmar pagamento
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 rounded-xl"
                      disabled={disabled}
                      onClick={() => {
                        updateDraft(ins.clientId, { paidAt: null, paidAmountCents: null })
                        commitToParent(ins.clientId, { paidAt: null, paidAmountCents: null })
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reabrir pagamento
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  )
})
