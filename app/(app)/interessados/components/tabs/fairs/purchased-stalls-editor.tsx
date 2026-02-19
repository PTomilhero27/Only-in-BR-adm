'use client'

import React, { useCallback, useMemo } from 'react'
import { Plus, Trash2, CreditCard } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

import { UnitPriceInput } from './unit-price-input'

/**
 * Este componente edita compras de barracas "1 por 1".
 *
 * Responsabilidade:
 * - Permitir o admin configurar tamanho, valor e pagamentos por unidade (linha).
 * - Manter coerência interna para gerar payload válido para o backend.
 *
 * Decisões:
 * - O enum de tamanho precisa espelhar o backend (Prisma StallSize).
 * - Agora incluímos CART (Carrinho) no fluxo de compra.
 */

/** ✅ tamanhos (espelho do enum do backend) */
export type StallSizeValue =
  | 'SIZE_2X2'
  | 'SIZE_3X3'
  | 'SIZE_3X6'
  | 'TRAILER'
  | 'CART'

const STALL_SIZES: Array<{ value: StallSizeValue; label: string }> = [
  { value: 'SIZE_2X2', label: '2m x 2m' },
  { value: 'SIZE_3X3', label: '3m x 3m' },
  { value: 'SIZE_3X6', label: '3m x 6m' },
  { value: 'TRAILER', label: 'Trailer / Food Truck' },
  { value: 'CART', label: 'Carrinho' }, // ✅ novo
]

function makeClientId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function todayISODateOnly(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatCentsToBRLText(cents: number) {
  const safe = Number.isFinite(cents) ? cents : 0
  return (safe / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export type PurchaseInstallmentDraft = {
  clientId: string
  number: number
  dueDate: string // YYYY-MM-DD
  amountCents: number
}

export type PurchasedStallDraft = {
  clientId: string
  stallSize: StallSizeValue
  unitPriceCents: number
  paidUpfrontCents: number
  installmentsCount: number // 0..12
  installments: PurchaseInstallmentDraft[] // length = installmentsCount (quando >0)
}

function buildEmptyPurchase(): PurchasedStallDraft {
  return {
    clientId: makeClientId(),
    stallSize: 'SIZE_3X3',
    unitPriceCents: 0,
    paidUpfrontCents: 0,
    installmentsCount: 0,
    installments: [],
  }
}

/**
 * Divide o restante em N parcelas, jogando o “resto” na última.
 */
function splitRemainingIntoInstallments(
  remainingCents: number,
  count: number,
): PurchaseInstallmentDraft[] {
  if (count <= 0) return []
  const base = Math.floor(remainingCents / count)
  const last = remainingCents - base * (count - 1)

  return Array.from({ length: count }).map((_, idx) => ({
    clientId: makeClientId(),
    number: idx + 1,
    dueDate: todayISODateOnly(),
    amountCents: idx === count - 1 ? last : base,
  }))
}

function validateOne(item: PurchasedStallDraft): string | null {
  const unit = Number(item.unitPriceCents)
  const paid = Number(item.paidUpfrontCents)
  const count = Number(item.installmentsCount)

  if (!item.stallSize) return 'Informe o tamanho.'
  if (!Number.isInteger(unit) || unit < 0) return 'Valor da barraca inválido.'
  if (!Number.isInteger(paid) || paid < 0) return 'Valor pago inválido.'
  if (paid > unit) return 'O valor pago não pode ser maior que o valor da barraca.'

  const remaining = unit - paid

  if (remaining === 0) {
    if (count !== 0) return 'Se já está tudo pago, installmentsCount deve ser 0.'
    if (item.installments.length !== 0) return 'Se já está tudo pago, não deve haver parcelas.'
    return null
  }

  if (!Number.isInteger(count) || count < 1 || count > 12) {
    return 'Informe em quantas parcelas será pago o restante (1–12).'
  }

  if (!Array.isArray(item.installments) || item.installments.length !== count) {
    return 'A lista de parcelas não confere com installmentsCount.'
  }

  const sum = item.installments.reduce((acc, i) => acc + (i.amountCents ?? 0), 0)
  if (sum !== remaining) {
    return `A soma das parcelas (R$ ${formatCentsToBRLText(sum)}) deve ser igual ao restante (R$ ${formatCentsToBRLText(remaining)}).`
  }

  for (const ins of item.installments) {
    if (!ins.dueDate) return 'Informe a data de vencimento de todas as parcelas.'
    if (!Number.isInteger(ins.amountCents) || ins.amountCents < 0) return 'Valor de parcela inválido.'
  }

  return null
}

function validateAll(items: PurchasedStallDraft[]): string | null {
  if (!items || items.length === 0) return 'Adicione ao menos 1 barraca.'
  for (let i = 0; i < items.length; i++) {
    const err = validateOne(items[i])
    if (err) return `Barraca ${i + 1}: ${err}`
  }
  return null
}

/**
 * Editor: compra de barracas 1 por 1 (tamanho + valores + parcelamento).
 *
 * Observação:
 * - Este editor não conhece backend.
 * - Ele apenas garante consistência interna para gerar payload válido.
 */
export function PurchasedStallsEditor(props: {
  value: PurchasedStallDraft[]
  onChange: (next: PurchasedStallDraft[]) => void
  disabled?: boolean
  error?: string | null
  onErrorChange?: (err: string | null) => void
}) {
  const { value, onChange, disabled, error, onErrorChange } = props

  const setNext = useCallback(
    (next: PurchasedStallDraft[]) => {
      onChange(next)
      onErrorChange?.(validateAll(next))
    },
    [onChange, onErrorChange],
  )

  const totals = useMemo(() => {
    const totalCents = value.reduce((acc, it) => acc + (it.unitPriceCents ?? 0), 0)
    const paidCents = value.reduce((acc, it) => acc + (it.paidUpfrontCents ?? 0), 0)
    const remainingCents = Math.max(0, totalCents - paidCents)
    return { totalCents, paidCents, remainingCents }
  }, [value])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Compra de barracas</div>
          <div className="text-xs text-muted-foreground">
            Informe tamanho, valor e quanto já foi pago.
          </div>
        </div>

        <Button
          variant="default"
          className="w-full"
          disabled={disabled}
          onClick={() => setNext([...(value ?? []), buildEmptyPurchase()])}
        >
          <Plus className="h-4 w-4" />
          Adicionar barraca
        </Button>
      </div>

      <Card className="rounded-2xl border bg-background/50 p-4">
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-sm">
            Barracas vinculadas: <b>{value.length}</b>
          </span>
          <span className="text-muted-foreground text-sm">
            Pago agora: <b>R$ {formatCentsToBRLText(totals.paidCents)}</b>
          </span>
          <span className="text-muted-foreground text-sm">
            Total: <b>R$ {formatCentsToBRLText(totals.totalCents)}</b>
          </span>
        </div>
      </Card>

      <div className="space-y-3">
        {value.map((item, idx) => {
          const unit = item.unitPriceCents ?? 0
          const paid = item.paidUpfrontCents ?? 0
          const remaining = Math.max(0, unit - paid)
          const needsInstallments = remaining > 0

          return (
            <Card
              key={item.clientId}
              className="gap-2 rounded-2xl border bg-background/50 p-4 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">Barraca {idx + 1}</div>

                    <Badge variant="secondary" className="rounded-full">
                      R$ {formatCentsToBRLText(unit)}
                    </Badge>

                    {remaining === 0 ? (
                      <Badge className="rounded-full bg-green-100 text-green-700">
                        Quitada
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-amber-100 text-amber-700">
                        Falta R$ {formatCentsToBRLText(remaining)}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    Configure tamanho e pagamento dessa unidade.
                  </div>
                </div>

                <Button
                  className="hover:text-red-500"
                  variant="ghost"
                  size="icon"
                  disabled={disabled || value.length === 1}
                  title="Remover"
                  onClick={() => setNext(value.filter((x) => x.clientId !== item.clientId))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Tamanho</div>
                  <Select
                    value={item.stallSize}
                    disabled={disabled}
                    onValueChange={(v) => {
                      const next = [...value]
                      next[idx] = { ...item, stallSize: v as StallSizeValue }
                      setNext(next)
                    }}
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
                  <div className="text-xs text-muted-foreground">Valor da barraca</div>
                  <UnitPriceInput
                    valueCents={item.unitPriceCents}
                    disabled={disabled}
                    onChangeCents={(unitPriceCents) => {
                      const next = [...value]
                      const safePaid = Math.min(item.paidUpfrontCents ?? 0, unitPriceCents)
                      const remainingNext = Math.max(0, unitPriceCents - safePaid)

                      if (remainingNext === 0) {
                        next[idx] = {
                          ...item,
                          unitPriceCents,
                          paidUpfrontCents: safePaid,
                          installmentsCount: 0,
                          installments: [],
                        }
                        setNext(next)
                        return
                      }

                      const count = item.installmentsCount ?? 0
                      const shouldRecalc = count > 0

                      next[idx] = {
                        ...item,
                        unitPriceCents,
                        paidUpfrontCents: safePaid,
                        installments: shouldRecalc
                          ? splitRemainingIntoInstallments(remainingNext, count)
                          : item.installments,
                      }
                      setNext(next)
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Valor pago</div>
                  <UnitPriceInput
                    valueCents={item.paidUpfrontCents}
                    disabled={disabled}
                    onChangeCents={(paidUpfrontCents) => {
                      const safePaid = Math.min(paidUpfrontCents, item.unitPriceCents ?? 0)
                      const remainingNext = Math.max(0, (item.unitPriceCents ?? 0) - safePaid)

                      const next = [...value]

                      if (remainingNext === 0) {
                        next[idx] = {
                          ...item,
                          paidUpfrontCents: safePaid,
                          installmentsCount: 0,
                          installments: [],
                        }
                        setNext(next)
                        return
                      }

                      const count = item.installmentsCount ?? 0
                      const shouldRecalc = count > 0

                      next[idx] = {
                        ...item,
                        paidUpfrontCents: safePaid,
                        installments: shouldRecalc
                          ? splitRemainingIntoInstallments(remainingNext, count)
                          : item.installments,
                      }
                      setNext(next)
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Falta pagar</span>
                <b>R$ {formatCentsToBRLText(remaining)}</b>
              </div>

              {needsInstallments ? (
                <>
                  <Separator />

                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Parcelamento do restante
                  </div>

                  <div className="">
                    <div className="rounded-2xl border bg-background p-3">
                      <div className="text-xs text-muted-foreground">Conferência</div>
                      <div className="mt-1 flex flex-col text-sm">
                        <span className="text-muted-foreground">
                          Soma parcelas:{' '}
                          <b>
                            R{'$'}{' '}
                            {formatCentsToBRLText(
                              item.installments.reduce((a, i) => a + (i.amountCents ?? 0), 0),
                            )}
                          </b>
                        </span>

                        <span className="text-muted-foreground">
                          Restante: <b>R$ {formatCentsToBRLText(remaining)}</b>
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground">Qtd. parcelas (1–12)</div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={String(item.installmentsCount ?? 0)}
                        disabled={disabled}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (!/^\d*$/.test(raw)) return

                          const count = raw === '' ? 0 : Math.max(0, Math.min(12, Number(raw)))
                          const next = [...value]

                          const installments =
                            count > 0 ? splitRemainingIntoInstallments(remaining, count) : []

                          next[idx] = { ...item, installmentsCount: count, installments }
                          setNext(next)
                        }}
                      />
                    </div>
                  </div>

                  {item.installmentsCount > 0 ? (
                    <div className="space-y-2">
                      {item.installments.map((ins, insIdx) => (
                        <div key={ins.clientId} className="rounded-2xl border bg-background p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Parcela {ins.number}</div>
                            <Badge variant="outline" className="rounded-full">
                              R$ {formatCentsToBRLText(ins.amountCents)}
                            </Badge>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Vencimento</div>
                              <Input
                                type="date"
                                value={ins.dueDate}
                                disabled={disabled}
                                onChange={(e) => {
                                  const next = [...value]
                                  const copy = [...(item.installments ?? [])]
                                  copy[insIdx] = { ...copy[insIdx], dueDate: e.target.value }
                                  next[idx] = { ...item, installments: copy }
                                  setNext(next)
                                }}
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Valor</div>
                              <UnitPriceInput
                                valueCents={ins.amountCents}
                                disabled={disabled}
                                onChangeCents={(amountCents) => {
                                  const next = [...value]
                                  const copy = [...(item.installments ?? [])]
                                  copy[insIdx] = { ...copy[insIdx], amountCents }
                                  next[idx] = { ...item, installments: copy }
                                  setNext(next)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </Card>
          )
        })}
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Dica: se <b>valor pago</b> for diferente do <b>valor da barraca</b>, configure parcelas e
          vencimentos do restante.
        </p>
      )}
    </div>
  )
}
