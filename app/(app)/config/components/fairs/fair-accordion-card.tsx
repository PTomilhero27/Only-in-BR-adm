'use client'

/**
 * Card de feira com Accordion (shadcn).
 * Responsabilidade:
 * - Exibir informações principais (nome, endereço, status e criador)
 * - Expandir detalhes/configurações sob demanda
 *
 * Decisões:
 * - Status alinhado ao contrato do backend (ATIVA/FINALIZADA/CANCELADA)
 * - "Dias" formatado a partir de occurrences (sempre presente no contrato)
 * - Criador preparado para backend via createdByName / fallback
 * - children permite extensões (ex.: gestão de formulários por feira)
 *
 * Atualização desta etapa (Capacidade de barracas):
 * - Mostramos métricas de capacidade no bloco "Configurações":
 *   - Capacidade total (stallsCapacity)
 *   - Reservadas (stallsReserved = soma de OwnerFair.stallsQty)
 *   - Restantes (stallsRemaining = capacity - reserved)
 *   - Vinculadas (stallsLinked = total de StallFair nesta feira) — quando disponível
 *
 * Observação:
 * - No endpoint GET /fairs atual, "vinculadas" pode não vir.
 *   Mantemos fallback para 0 até o backend expor esse número.
 */

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, MapPin, User, Users, FileText, Store, LayoutGrid } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

import type { Fair, FairStatus } from '@/app/modules/fairs/types'

function statusLabel(status: FairStatus) {
  if (status === 'ATIVA') return 'Ativa'
  if (status === 'FINALIZADA') return 'Finalizada'
  if (status === 'CANCELADA') return 'Cancelada'
  return status
}

function statusBadgeClass(status: FairStatus) {
  if (status === 'ATIVA') return 'bg-green-100 text-green-700'
  if (status === 'FINALIZADA') return 'bg-slate-100 text-slate-700'
  if (status === 'CANCELADA') return 'bg-red-100 text-red-700'
  return 'bg-slate-100 text-slate-700'
}

function formatDays(occurrences: Fair['occurrences']) {
  if (!occurrences || occurrences.length === 0) return '—'

  const days = occurrences
    .map((o) => {
      try {
        return format(new Date(o.startsAt), 'dd MMM', { locale: ptBR })
      } catch {
        return null
      }
    })
    .filter(Boolean) as string[]

  return days.length ? days.join(' • ') : '—'
}

/**
 * Card estatístico (somente leitura).
 * Decisão:
 * - Mantemos como "button disabled" para reaproveitar estilos de foco/hover sem click.
 */
function StatButton({
  title,
  value,
  icon,
  description,
}: {
  title: string
  value: React.ReactNode
  icon: React.ReactNode
  description?: string
}) {
  return (
    <button
      type="button"
      disabled
      className="
        w-full rounded-2xl border p-4 text-left
        transition-colors
        hover:bg-muted/40
        disabled:cursor-not-allowed
        disabled:opacity-100
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-semibold">{title}</div>
          {description ? (
            <div className="text-xs text-muted-foreground">{description}</div>
          ) : null}
        </div>

        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-muted/20">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-2xl font-semibold leading-none">{value}</div>
    </button>
  )
}

export function FairAccordionCard({
  fair,
  actions,
  children,
}: {
  fair: Fair
  /**
   * Ações do card (ex.: UpsertFairDialog).
   * Ficam dentro do conteúdo expandido para manter o header limpo.
   */
  actions?: React.ReactNode

  /**
   * Conteúdo extra renderizado abaixo do grid principal.
   * Usado para extensões do card (ex.: gestão de FairForms, contratos, pagamentos).
   */
  children?: React.ReactNode
}) {
  const createdByLabel = fair.createdByName ?? fair.createdBy?.name ?? '—'
  const daysLabel = formatDays(fair.occurrences)

  /**
   * Contagens vindas do backend (com fallback).
   * Importante: fallback evita quebra caso algum ambiente ainda não tenha migrado.
   */
  const exhibitorsCount =
    typeof (fair as any).exhibitorsCount === 'number' ? (fair as any).exhibitorsCount : 0

  /**
   * ✅ Capacidade e reservas (novo contrato):
   * - capacity: limite total da feira
   * - reserved: soma de barracas compradas (OwnerFair.stallsQty)
   * - remaining: capacidade - reservadas
   */
  const stallsCapacity =
    typeof (fair as any).stallsCapacity === 'number' ? (fair as any).stallsCapacity : 0

  const stallsReserved =
    typeof (fair as any).stallsReserved === 'number'
      ? (fair as any).stallsReserved
      : typeof (fair as any).stallsQtyTotal === 'number'
        ? (fair as any).stallsQtyTotal
        : 0

  const stallsRemaining =
    typeof (fair as any).stallsRemaining === 'number'
      ? (fair as any).stallsRemaining
      : Math.max(0, stallsCapacity - stallsReserved)

  /**
   * ✅ Barracas vinculadas (selecionadas):
   * - ideal: backend retornar stallsLinked no GET /fairs (contagem de StallFair)
   * - fallback: 0 (até você expor isso no list)
   */
  const stallsLinked =
    typeof (fair as any).stallsLinked === 'number' ? (fair as any).stallsLinked : 0

  /**
   * Formulários ativos = FairForm.enabled && Form.active
   */
  const fairForms = Array.isArray((fair as any).fairForms) ? (fair as any).fairForms : []
  const activeFormsCount = fairForms.filter((ff: any) => ff?.enabled === true && ff?.active === true).length

  return (
    <Card className="rounded-2xl border p-0 shadow-sm">
      <Accordion type="single" collapsible>
        <AccordionItem value={`fair-${fair.id}`} className="border-none">
          <AccordionTrigger className="cursor-pointer rounded-2xl px-4 py-4 hover:no-underline">
            <div className="flex w-full items-start justify-between gap-4">
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-base font-semibold leading-tight">{fair.name}</div>

                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{fair.address ? fair.address : 'Local não informado'}</span>
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="truncate">Criada por: {createdByLabel}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                    fair.status,
                  )}`}
                >
                  {statusLabel(fair.status)}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="px-4 pb-4">
            <Separator className="mb-4" />

            <div className="grid gap-3 md:grid-cols-2">
              {/* Detalhes */}
              <Card className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Detalhes</div>

                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">{statusLabel(fair.status)}</span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Local</span>
                    <span className="font-medium text-right">{fair.address ?? '—'}</span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Criada por</span>
                    <span className="font-medium text-right">{createdByLabel}</span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      Dias
                    </span>
                    <span className="font-medium text-right">{daysLabel}</span>
                  </div>

                  {/* ✅ NOVO: capacidade nos detalhes */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <LayoutGrid className="h-4 w-4" />
                      Capacidade
                    </span>
                    <span className="font-medium text-right">{stallsCapacity}</span>
                  </div>
                </div>

                {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
              </Card>

              {/* Configurações / Resumo */}
              <Card className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">Configurações</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Resumo rápido do que existe nesta feira.
                </div>

                {/* Cards */}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <StatButton
                    title="Expositores"
                    value={exhibitorsCount}
                    description="Vinculados à feira"
                    icon={<Users className="h-4 w-4" />}
                  />

                  <StatButton
                    title="Barracas"
                    value={
                      <span className="tabular-nums">
                        {stallsLinked}/{stallsCapacity}
                      </span>
                    }
                    description="Barracas vinculadas"
                    icon={<Store className="h-4 w-4" />}
                  />

                  <StatButton
                    title="Reservadas"
                    value={stallsReserved}
                    description="Compradas"
                    icon={<Store className="h-4 w-4" />}
                  />
                </div>

              </Card>
            </div>

            {children ? (
              <>
                <Separator className="my-4" />
                {children}
              </>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  )
}
