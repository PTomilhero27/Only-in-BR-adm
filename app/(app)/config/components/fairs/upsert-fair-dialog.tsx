'use client'

/**
 * Este dialog é responsável por criar e editar feiras.
 *
 * Responsabilidades:
 * - Coletar dados básicos da feira
 * - Coletar ocorrências (quando permitido)
 * - Coletar taxas sobre venda
 * - Montar o payload final respeitando o contrato do backend
 *
 * Decisões:
 * - No modo de edição, preservamos o `id` das taxas já existentes.
 * - A UI continua simples (usuário só digita percentual), mas internamente
 *   mantemos metadados suficientes para não perder identidade das taxas.
 * - O nome da taxa continua sendo gerado automaticamente como "Taxa 1", "Taxa 2"...
 *   para manter o comportamento atual do projeto.
 */

import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

type Mode = 'create' | 'edit'

export type FairOccurrenceForm = {
  date: string
  startTime: string
  endTime: string
}

/**
 * Contrato enviado ao backend no create/update.
 *
 * Regras:
 * - `id` existe quando a taxa já foi criada anteriormente
 * - `id` ausente significa nova taxa
 */
export type FairTaxInput = {
  id?: string
  name: string
  percentBps: number
}

/**
 * Shape interno da UI para taxa.
 *
 * Decisão:
 * - Mantemos `id` para edição segura
 * - Mantemos `percentRaw` como string para facilitar digitação no input
 * - Mantemos `name` por consistência futura, mesmo que hoje ele seja gerado automaticamente
 */
type FairTaxFormItem = {
  id?: string
  name: string
  percentRaw: string
}

export type UpsertFairDefaultValues = {
  id?: string
  name?: string
  address?: string
  stallsCapacity?: number
  occurrences?: Array<{ startsAt: string; endsAt: string }>
  taxes?: Array<{
    id: string
    name: string
    percentBps: number
    isActive: boolean
    createdAt: string
    updatedAt: string
  }>
}

export function UpsertFairDialog({
  mode,
  triggerText,
  defaultValues,
  allowOccurrencesOnEdit = false,
  isSubmitting,
  onSubmit,
}: {
  mode: Mode
  triggerText: string
  defaultValues?: UpsertFairDefaultValues
  allowOccurrencesOnEdit?: boolean
  isSubmitting?: boolean
  onSubmit: (data: {
    id?: string
    name: string
    address: string
    stallsCapacity: number
    occurrences?: Array<{ startsAt: string; endsAt: string }>
    taxes: FairTaxInput[]
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  /**
   * Por padrão, ocorrências só aparecem na criação.
   * Mantemos a flag para permitir edição no futuro sem reescrever o componente.
   */
  const showOccurrences = mode === 'create' || allowOccurrencesOnEdit

  const [id, setId] = useState<string | undefined>(defaultValues?.id)
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [address, setAddress] = useState(defaultValues?.address ?? '')

  const [stallsCapacityRaw, setStallsCapacityRaw] = useState(
    defaultValues?.stallsCapacity !== undefined ? String(defaultValues.stallsCapacity) : '',
  )

  const [occurrences, setOccurrences] = useState<FairOccurrenceForm[]>([
    { date: '', startTime: '', endTime: '' },
  ])

  /**
   * Estado das taxas preservando `id`.
   *
   * Isso é o ponto principal da correção:
   * - antes, o componente guardava somente os percentuais
   * - agora, ele guarda também o `id` da taxa existente
   */
  const [taxes, setTaxes] = useState<FairTaxFormItem[]>([
    {
      name: 'Taxa 1',
      percentRaw: '',
    },
  ])

  function isoToForm(isoStart: string, isoEnd: string): FairOccurrenceForm {
    const start = new Date(isoStart)
    const end = new Date(isoEnd)

    const pad = (n: number) => String(n).padStart(2, '0')

    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
    const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`

    return { date, startTime, endTime }
  }

  /**
   * Converte BPS para string percentual amigável na UI.
   *
   * Exemplos:
   * - 2500 -> "25"
   * - 1800 -> "18"
   */
  function bpsToPercentRaw(bps: number) {
    const percent = Number(bps ?? 0) / 100
    return percent === 0 ? '' : String(percent)
  }

  /**
   * Gera o label padrão da taxa com base na posição visual.
   *
   * Mantivemos esse comportamento porque hoje a UI não edita nome manualmente.
   */
  function buildAutoTaxName(index: number) {
    return `Taxa ${index + 1}`
  }

  /**
   * Reidrata o formulário quando o dialog abre.
   *
   * Decisão:
   * - Abrir dialog sempre reseta para o estado atual do backend
   * - Evita ficar com lixo de interação anterior
   */
  function resetFromDefaults() {
    setId(defaultValues?.id)
    setName(defaultValues?.name ?? '')
    setAddress(defaultValues?.address ?? '')
    setStallsCapacityRaw(
      defaultValues?.stallsCapacity !== undefined ? String(defaultValues.stallsCapacity) : '',
    )

    if (showOccurrences && defaultValues?.occurrences?.length) {
      setOccurrences(defaultValues.occurrences.map((o) => isoToForm(o.startsAt, o.endsAt)))
    } else {
      setOccurrences([{ date: '', startTime: '', endTime: '' }])
    }

    if (defaultValues?.taxes?.length) {
      const sourceTaxes = defaultValues.taxes.filter((t) => t.isActive !== false)

      setTaxes(
        (sourceTaxes.length ? sourceTaxes : defaultValues.taxes).map((tax, index) => ({
          id: tax.id,
          name: tax.name || buildAutoTaxName(index),
          percentRaw: bpsToPercentRaw(tax.percentBps),
        })),
      )
    } else {
      setTaxes([
        {
          name: 'Taxa 1',
          percentRaw: '',
        },
      ])
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (nextOpen) {
      resetFromDefaults()
    }
  }

  const stallsCapacityNumber = useMemo(() => {
    const n = Number(stallsCapacityRaw)
    return Number.isFinite(n) ? n : NaN
  }, [stallsCapacityRaw])

  function formToIso(o: FairOccurrenceForm) {
    const startsAt = new Date(`${o.date}T${o.startTime}`).toISOString()
    const endsAt = new Date(`${o.date}T${o.endTime}`).toISOString()

    return { startsAt, endsAt }
  }

  function addOccurrence() {
    setOccurrences((prev) => [...prev, { date: '', startTime: '', endTime: '' }])
  }

  function removeOccurrence(index: number) {
    setOccurrences((prev) => prev.filter((_, i) => i !== index))
  }

  function updateOccurrence(index: number, patch: Partial<FairOccurrenceForm>) {
    setOccurrences((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  // ---------------------------------------------------------
  // Helpers de taxas
  // ---------------------------------------------------------

  /**
   * Adiciona uma nova taxa sem `id`.
   *
   * Isso sinaliza ao backend que se trata de uma taxa nova.
   */
  function addTax() {
    setTaxes((prev) => [
      ...prev,
      {
        name: buildAutoTaxName(prev.length),
        percentRaw: '',
      },
    ])
  }

  function removeTax(index: number) {
    setTaxes((prev) => {
      const next = prev.filter((_, i) => i !== index)

      /**
       * Reindexa os nomes automáticos para manter UI consistente.
       * Mantemos os `id`s já existentes mesmo trocando a posição.
       */
      return next.map((item, itemIndex) => ({
        ...item,
        name: buildAutoTaxName(itemIndex),
      }))
    })
  }

  function updateTax(index: number, value: string) {
    setTaxes((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              percentRaw: value,
            }
          : item,
      ),
    )
  }

  /**
   * Converte percentual digitado na UI para BPS.
   *
   * Exemplos:
   * - "5" => 500
   * - "18" => 1800
   * - "25.5" => 2550
   */
  function percentRawToBps(raw: string) {
    const normalized = (raw ?? '').trim()

    if (!normalized) return NaN

    const percent = Number(normalized.replace(',', '.'))

    if (!Number.isFinite(percent)) return NaN

    return Math.round(percent * 100)
  }

  const parsedTaxes = useMemo(() => {
    return taxes.map((tax, index) => ({
      id: tax.id,
      name: tax.name || buildAutoTaxName(index),
      raw: tax.percentRaw,
      percentBps: percentRawToBps(tax.percentRaw),
    }))
  }, [taxes])

  const taxesErrors = useMemo(() => {
    const errors: string[] = []

    if (!parsedTaxes.length) {
      errors.push('Adicione ao menos uma taxa.')
    }

    parsedTaxes.forEach((tax, index) => {
      if (!Number.isFinite(tax.percentBps)) {
        errors.push(`Taxa ${index + 1}: informe um percentual válido.`)
        return
      }

      if (tax.percentBps < 0) {
        errors.push(`Taxa ${index + 1}: não pode ser negativa.`)
      }

      if (tax.percentBps > 10000) {
        errors.push(`Taxa ${index + 1}: não pode passar de 100%.`)
      }
    })

    return errors
  }, [parsedTaxes])

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    if (!address.trim()) return false

    if (!Number.isFinite(stallsCapacityNumber)) return false
    if (stallsCapacityNumber <= 0) return false

    if (taxesErrors.length > 0) return false

    if (!showOccurrences) return true
    if (!occurrences.length) return false

    return occurrences.every((o) => o.date && o.startTime && o.endTime)
  }, [name, address, stallsCapacityNumber, taxesErrors.length, showOccurrences, occurrences])

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return

    const payloadOccurrences = showOccurrences ? occurrences.map(formToIso) : undefined

    /**
     * Payload final respeitando o contrato do backend:
     * - taxa existente => envia `id`
     * - taxa nova => não envia `id`
     *
     * O nome continua sendo padronizado automaticamente por posição.
     */
    const taxesPayload: FairTaxInput[] = parsedTaxes.map((tax, index) => ({
      ...(tax.id ? { id: tax.id } : {}),
      name: buildAutoTaxName(index),
      percentBps: tax.percentBps,
    }))

    await onSubmit({
      id,
      name: name.trim(),
      address: address.trim(),
      stallsCapacity: stallsCapacityNumber,
      occurrences: payloadOccurrences,
      taxes: taxesPayload,
    })

    setOpen(false)
  }

  const title = mode === 'create' ? 'Nova feira' : 'Editar feira'
  const primaryCta = mode === 'create' ? 'Criar' : 'Salvar'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={mode === 'create' ? 'secondary' : 'default'}>{triggerText}</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(85vh-156px)] overflow-y-auto px-6 pb-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fair-name">Nome</Label>
              <Input
                id="fair-name"
                placeholder="Ex.: Feira Gastronômica de Verão"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fair-address">Endereço</Label>
              <Input
                id="fair-address"
                placeholder="Ex.: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fair-capacity">Capacidade de barracas</Label>
              <Input
                id="fair-capacity"
                type="number"
                min={1}
                step={1}
                placeholder="Ex.: 120"
                value={stallsCapacityRaw}
                onChange={(e) => setStallsCapacityRaw(e.target.value)}
                disabled={isSubmitting}
              />
              <div className="text-xs text-muted-foreground">
                Limite máximo de barracas disponíveis nesta feira.
              </div>
            </div>

            <Separator />

            {/* Taxas */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Taxas sobre venda</div>
                  <div className="text-xs text-muted-foreground">
                    Adicione quantas taxas quiser. Salvamos em BPS (ex.: 5% = 500).
                  </div>
                </div>

                <Button type="button" variant="secondary" onClick={addTax} disabled={isSubmitting}>
                  Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {taxes.map((tax, index) => (
                  <div
                    key={tax.id ?? `new-tax-${index}`}
                    className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2"
                  >
                    <div className="w-16 shrink-0 text-xs text-muted-foreground">
                      {buildAutoTaxName(index)}
                    </div>

                    <div className="flex flex-1 items-center gap-2">
                      <div className="text-sm text-muted-foreground">%</div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder="Ex.: 5"
                        value={tax.percentRaw}
                        onChange={(e) => updateTax(index, e.target.value)}
                        disabled={isSubmitting}
                        className="h-9"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeTax(index)}
                      disabled={isSubmitting || taxes.length === 1}
                      className="h-9 px-2"
                      aria-label={`Remover taxa ${index + 1}`}
                      title="Remover"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>

              {taxesErrors.length ? (
                <div className="space-y-1 text-xs text-destructive">
                  {taxesErrors.slice(0, 4).map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Intervalo permitido: 0% a 100%.
                </div>
              )}
            </div>

            {showOccurrences ? (
              <>
                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Ocorrências</div>
                      <div className="text-xs text-muted-foreground">
                        Cada ocorrência representa um dia com horário de início e término.
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={addOccurrence}
                      disabled={isSubmitting}
                    >
                      Adicionar dia
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {occurrences.map((occ, index) => (
                      <div key={index} className="rounded-xl border p-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Data</Label>
                            <Input
                              type="date"
                              value={occ.date}
                              onChange={(e) => updateOccurrence(index, { date: e.target.value })}
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Início</Label>
                            <Input
                              type="time"
                              value={occ.startTime}
                              onChange={(e) =>
                                updateOccurrence(index, { startTime: e.target.value })
                              }
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Fim</Label>
                            <Input
                              type="time"
                              value={occ.endTime}
                              onChange={(e) => updateOccurrence(index, { endTime: e.target.value })}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeOccurrence(index)}
                            disabled={isSubmitting || occurrences.length === 1}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Salvando...' : primaryCta}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}