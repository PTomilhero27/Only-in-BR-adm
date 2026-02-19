'use client'

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
 * ✅ Contrato alinhado ao Prisma:
 * Fair.taxes -> FairTax
 */
export type FairTaxInput = {
  id?: string
  name: string
  percentBps: number
}

export type UpsertFairDefaultValues = {
  id?: string
  name?: string
  address?: string
  stallsCapacity?: number
  occurrences?: Array<{ startsAt: string; endsAt: string }>

  /**
   * ✅ vem do backend: FairTax[]
   */
  taxes?: Array<{
    id: string
    name: string
    percentBps: number
    isActive: boolean
    createdAt: string
    updatedAt: string
    fairId: string
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
   * ✅ UI: somente percentuais (string)
   * Envio: taxes[] com name auto + percentBps
   */
  const [taxesPercentRaw, setTaxesPercentRaw] = useState<string[]>([''])

  function isoToForm(isoStart: string, isoEnd: string): FairOccurrenceForm {
    const start = new Date(isoStart)
    const end = new Date(isoEnd)

    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
    const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`

    return { date, startTime, endTime }
  }

  function bpsToPercentRaw(bps: number) {
    const percent = Number(bps ?? 0) / 100
    return percent === 0 ? '' : String(percent)
  }

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
      // Só usa as ativas (se quiser mostrar todas, remova o filter)
      const actives = defaultValues.taxes.filter((t) => t.isActive !== false)
      setTaxesPercentRaw(
        (actives.length ? actives : defaultValues.taxes).map((t) => bpsToPercentRaw(t.percentBps)),
      )
    } else {
      setTaxesPercentRaw([''])
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) resetFromDefaults()
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

  // -----------------------------
  // Taxes helpers
  // -----------------------------
  function addTax() {
    setTaxesPercentRaw((prev) => [...prev, ''])
  }

  function removeTax(index: number) {
    setTaxesPercentRaw((prev) => prev.filter((_, i) => i !== index))
  }

  function updateTax(index: number, value: string) {
    setTaxesPercentRaw((prev) => prev.map((v, i) => (i === index ? value : v)))
  }

  function percentRawToBps(raw: string) {
    const v = (raw ?? '').trim()
    if (!v) return NaN
    const percent = Number(v.replace(',', '.'))
    if (!Number.isFinite(percent)) return NaN
    return Math.round(percent * 100) // 0.01% => 1 bps
  }

  const parsedTaxes = useMemo(() => {
    return taxesPercentRaw.map((raw) => ({
      raw,
      percentBps: percentRawToBps(raw),
    }))
  }, [taxesPercentRaw])

  const taxesErrors = useMemo(() => {
    const errors: string[] = []

    // Se quiser deixar opcional, remova esta regra:
    if (!parsedTaxes.length) errors.push('Adicione ao menos uma taxa.')

    parsedTaxes.forEach((t, idx) => {
      if (!Number.isFinite(t.percentBps)) {
        errors.push(`Taxa ${idx + 1}: informe um percentual válido.`)
        return
      }
      if (t.percentBps < 0) errors.push(`Taxa ${idx + 1}: não pode ser negativa.`)
      if (t.percentBps > 10000) errors.push(`Taxa ${idx + 1}: não pode passar de 100%.`)
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
     * ✅ Prisma exige FairTax.name, mas você não quer input:
     * então geramos automaticamente "Taxa 1", "Taxa 2"...
     */
    const taxesPayload: FairTaxInput[] = parsedTaxes.map((t, index) => ({
      name: `Taxa ${index + 1}`,
      percentBps: t.percentBps,
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

      {/* ✅ Scroll + layout clean */}
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="px-6 overflow-y-auto max-h-[calc(85vh-156px)] pb-6">
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

            {/* ✅ Taxes (somente %) */}
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
                {taxesPercentRaw.map((value, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2"
                  >
                    <div className="text-xs text-muted-foreground w-16 shrink-0">
                      Taxa {index + 1}
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">%</div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder="Ex.: 5"
                        value={value}
                        onChange={(e) => updateTax(index, e.target.value)}
                        disabled={isSubmitting}
                        className="h-9"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeTax(index)}
                      disabled={isSubmitting || taxesPercentRaw.length === 1}
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
                <div className="text-xs text-destructive space-y-1">
                  {taxesErrors.slice(0, 4).map((e, idx) => (
                    <div key={idx}>• {e}</div>
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

        <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-end gap-2">
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
