'use client'

import React, { useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OwnerFairStallSlotInput, StallSizeValue, sumSlotsQty } from '@/app/modules/interest-fairs/hooks/use-owner-fair-link-form'
import { UnitPriceInput } from './unit-price-input'

/**
 * Editor de compra de barracas por tamanho (slots).
 *
 * Responsabilidade:
 * - Permitir editar (tamanho, qty, valor unitário)
 * - Validar regras básicas (sem repetir tamanho, qty>0, total<=100)
 *
 * Obs:
 * - A validação de CAPACIDADE da feira fica fora (no hook), pois depende da feira selecionada.
 */

const STALL_SIZES = [
  { value: 'SIZE_2X2', label: '2m x 2m' },
  { value: 'SIZE_3X3', label: '3m x 3m' },
  { value: 'SIZE_3X6', label: '3m x 6m' },
  { value: 'TRAILER', label: 'Trailer / Food Truck' },
] as const

function formatCentsToBRLText(cents: number) {
  const safe = Number.isFinite(cents) ? cents : 0
  return (safe / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function makeClientId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const StallSlotsEditor = React.memo(function StallSlotsEditor(props: {
  value: OwnerFairStallSlotInput[]
  onChange: (next: OwnerFairStallSlotInput[]) => void
  disabled?: boolean
  error?: string | null
  onErrorChange?: (err: string | null) => void
}) {
  const { value, onChange, disabled, error, onErrorChange } = props

  const usedSizes = useMemo(() => new Set(value.map((s) => s.stallSize)), [value])
  const totalQty = useMemo(() => sumSlotsQty(value), [value])

  const validateSlots = useCallback((slots: OwnerFairStallSlotInput[]): string | null => {
    if (!slots || slots.length === 0) return 'Informe ao menos um tamanho de barraca.'
    const total = sumSlotsQty(slots)
    if (total < 1) return 'A quantidade mínima é 1 barraca.'
    if (total > 100) return 'O total não pode ultrapassar 100 barracas.'

    const sizes = slots.map((s) => s.stallSize)
    const unique = new Set(sizes)
    if (unique.size !== sizes.length) return 'Não é permitido repetir o mesmo tamanho.'

    for (const s of slots) {
      if (!Number.isFinite(s.qty) || s.qty <= 0) return 'Cada item deve ter quantidade maior que 0.'
      if (!Number.isFinite(s.unitPriceCents) || s.unitPriceCents < 0)
        return 'O valor unitário não pode ser negativo.'
    }

    return null
  }, [])

  const setNext = useCallback(
    (next: OwnerFairStallSlotInput[]) => {
      onChange(next)
      const err = validateSlots(next)
      onErrorChange?.(err)
    },
    [onChange, onErrorChange, validateSlots],
  )

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">Compra de barracas (por tamanho)</div>
      <div className="text-xs text-muted-foreground">
        Quantidade e valor unitário por tamanho. Total calculado automaticamente.
      </div>

      <div className="space-y-2">
        {value.map((slot, idx) => (
          <div key={slot.clientId} className="rounded-2xl border bg-background/50 p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Tamanho</div>

                <Select
                  value={slot.stallSize}
                  onValueChange={(v) => {
                    const nextValue = v as StallSizeValue
                    if (usedSizes.has(nextValue) && nextValue !== slot.stallSize) return

                    const copy = [...value]
                    copy[idx] = { ...copy[idx], stallSize: nextValue }
                    setNext(copy)
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    {STALL_SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Quantidade</div>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(slot.qty)}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (!/^\d*$/.test(raw)) return
                    const qty = raw === '' ? 0 : Number(raw)
                    if (qty > 100) return

                    const copy = [...value]
                    copy[idx] = { ...copy[idx], qty }
                    setNext(copy)
                  }}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Valor unitário</div>
                <UnitPriceInput
                  valueCents={slot.unitPriceCents}
                  disabled={disabled}
                  onChangeCents={(next) => {
                    const copy = [...value]
                    copy[idx] = { ...copy[idx], unitPriceCents: next }
                    setNext(copy)
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                Subtotal:{' '}
                <b>
                  {slot.qty} × R$ {formatCentsToBRLText(slot.unitPriceCents)}
                </b>
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={disabled || value.length === 1}
                onClick={() => {
                  const next = value.filter((s) => s.clientId !== slot.clientId)
                  setNext(next)
                }}
              >
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm">
          Total: <b>{totalQty}</b> barraca(s)
        </div>

        <Button
          variant="outline"
          disabled={disabled || value.length >= STALL_SIZES.length}
          onClick={() => {
            const nextSize = STALL_SIZES.find((s) => !usedSizes.has(s.value))?.value
            if (!nextSize) return

            const next = [
              ...value,
              { clientId: makeClientId(), stallSize: nextSize as StallSizeValue, qty: 1, unitPriceCents: 0 },
            ]
            setNext(next)
          }}
        >
          Adicionar tamanho
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Dica: não repita tamanhos e mantenha o total entre <b>1</b> e <b>100</b>.
        </p>
      )}
    </div>
  )
})
