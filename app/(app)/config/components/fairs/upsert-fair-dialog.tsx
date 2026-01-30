'use client'

import { useEffect, useMemo, useState } from 'react'
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

/**
 * Dialog unificado para CRIAR e EDITAR uma feira (Upsert).
 *
 * Responsabilidade:
 * - Reutilizar a mesma UI e estrutura de formulário para "create" e "edit"
 * - Evitar duplicação de componentes quase iguais
 *
 * Decisão (capacidade de barracas):
 * - stallsCapacity é definido na feira e representa o limite físico total de barracas.
 * - A validação “não ultrapassar capacidade” será aplicada no backend ao criar/editar vínculo (OwnerFair),
 *   mas aqui já garantimos input válido (UX melhor).
 *
 * Decisão (ocorrências):
 * - UI baseada em "Dia" + "Hora início" + "Hora fim"
 * - Evita redundância de datetime-local em duplicidade
 * - Na submissão convertemos para startsAt/endsAt (contrato do backend)
 */

type Mode = 'create' | 'edit'

/**
 * Forma da ocorrência no FORM.
 * - date: YYYY-MM-DD
 * - startTime/endTime: HH:mm
 *
 * Decisão:
 * - Separa data e hora para UX melhor
 * - Mantém conversão simples e previsível para ISO
 */
export type FairOccurrenceForm = {
  date: string
  startTime: string
  endTime: string
}

export type UpsertFairDefaultValues = {
  id?: string
  name?: string
  address?: string

  /**
   * ✅ Capacidade de barracas já configurada na feira.
   * Usada para preencher o input em modo "edit".
   */
  stallsCapacity?: number

  /**
   * Se vier do backend ao editar, convertimos para date/startTime/endTime ao abrir o modal.
   */
  occurrences?: Array<{ startsAt: string; endsAt: string }>
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
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  const [id, setId] = useState<string | undefined>(defaultValues?.id)
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [address, setAddress] = useState(defaultValues?.address ?? '')

  /**
   * ✅ Capacidade de barracas.
   * Mantemos como string no state para:
   * - permitir input vazio temporariamente
   * - evitar “pular cursor” quando o usuário digita
   */
  const [stallsCapacityRaw, setStallsCapacityRaw] = useState(
    defaultValues?.stallsCapacity !== undefined ? String(defaultValues.stallsCapacity) : '',
  )

  const [occurrences, setOccurrences] = useState<FairOccurrenceForm[]>([
    { date: '', startTime: '', endTime: '' },
  ])

  /**
   * Converte ISO (backend) -> (date, startTime, endTime)
   * para preencher o form em modo edit (quando permitido).
   */
  function isoToForm(isoStart: string, isoEnd: string): FairOccurrenceForm {
    const start = new Date(isoStart)
    const end = new Date(isoEnd)

    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
    const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`
    const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`

    return { date, startTime, endTime }
  }

  useEffect(() => {
    if (!open) return

    setId(defaultValues?.id)
    setName(defaultValues?.name ?? '')
    setAddress(defaultValues?.address ?? '')

    setStallsCapacityRaw(
      defaultValues?.stallsCapacity !== undefined ? String(defaultValues.stallsCapacity) : '',
    )

    // Se vier occurrences do backend e o modo permitir editar occurrences, convertemos pro novo formato do form
    const canEditOccurrences = mode === 'create' || allowOccurrencesOnEdit
    if (canEditOccurrences && defaultValues?.occurrences?.length) {
      setOccurrences(defaultValues.occurrences.map((o) => isoToForm(o.startsAt, o.endsAt)))
    } else {
      setOccurrences([{ date: '', startTime: '', endTime: '' }])
    }
  }, [open, defaultValues, mode, allowOccurrencesOnEdit])

  const showOccurrences = mode === 'create' || allowOccurrencesOnEdit

  const stallsCapacityNumber = useMemo(() => {
    // Normaliza para número ou NaN
    const n = Number(stallsCapacityRaw)
    return Number.isFinite(n) ? n : NaN
  }, [stallsCapacityRaw])

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    if (!address.trim()) return false

    // ✅ capacidade obrigatória e > 0 (ajuste para >= 0 se preferir)
    if (!Number.isFinite(stallsCapacityNumber)) return false
    if (stallsCapacityNumber <= 0) return false

    if (!showOccurrences) return true
    if (!occurrences.length) return false

    // Valida que cada "dia" tem data + início + fim
    return occurrences.every((o) => o.date && o.startTime && o.endTime)
  }, [name, address, occurrences, showOccurrences, stallsCapacityNumber])

  function addOccurrence() {
    setOccurrences((prev) => [...prev, { date: '', startTime: '', endTime: '' }])
  }

  function removeOccurrence(index: number) {
    setOccurrences((prev) => prev.filter((_, i) => i !== index))
  }

  function updateOccurrence(index: number, patch: Partial<FairOccurrenceForm>) {
    setOccurrences((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  /**
   * Converte (date + startTime + endTime) para ISO (startsAt/endsAt),
   * que é o formato aceito pelo backend.
   *
   * Observação:
   * - Aqui usamos o timezone local do navegador ao criar Date.
   * - Se quiser padronizar tudo em UTC, ajustamos depois.
   */
  function formToIso(o: FairOccurrenceForm) {
    const startsAt = new Date(`${o.date}T${o.startTime}`).toISOString()
    const endsAt = new Date(`${o.date}T${o.endTime}`).toISOString()
    return { startsAt, endsAt }
  }

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return

    const payloadOccurrences = showOccurrences ? occurrences.map(formToIso) : undefined

    await onSubmit({
      id,
      name: name.trim(),
      address: address.trim(),
      stallsCapacity: stallsCapacityNumber,
      occurrences: payloadOccurrences,
    })

    setOpen(false)
  }

  const title = mode === 'create' ? 'Nova feira' : 'Editar feira'
  const primaryCta = mode === 'create' ? 'Criar' : 'Salvar'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={mode === 'create' ? 'secondary' : 'default'}>{triggerText}</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          {/* ✅ NOVO: Capacidade de barracas */}
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
              Número máximo de barracas disponíveis nesta feira.
            </div>
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

          <Separator />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Salvando...' : primaryCta}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
