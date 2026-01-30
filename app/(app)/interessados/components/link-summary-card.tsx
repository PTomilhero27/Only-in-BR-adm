'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Fair } from '@/app/modules/fairs/types'
import { getFairCapacityInfo } from '@/app/modules/interest-fairs/hooks/use-owner-fair-link-form'

function formatCentsToBRLText(cents: number) {
  const safe = Number.isFinite(cents) ? cents : 0
  return (safe / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Card de resumo do vínculo.
 * Responsabilidade:
 * - Mostrar “quantidade”, “total” e “restantes”
 * - Renderizar erros de validação (capacidade/pagamento/etc.)
 */
export function LinkSummaryCard(props: {
  fair: Fair | null
  stallsQty: number
  totalCents: number
  capacityError?: string | null
}) {
  const { fair, stallsQty, totalCents, capacityError } = props
  const cap = getFairCapacityInfo(fair)

  return (
    <Card className="rounded-2xl border bg-background/50 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="text-sm font-semibold">Resumo</div>

        {fair ? (
          <Badge variant="secondary" className="rounded-full">
            Restantes: {cap.remaining}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-background p-3">
          <div className="text-xs text-muted-foreground">Barracas (total)</div>
          <div className="mt-1 text-lg font-semibold">{stallsQty}</div>
        </div>

        <div className="rounded-xl border bg-background p-3">
          <div className="text-xs text-muted-foreground">Total (estimado)</div>
          <div className="mt-1 text-lg font-semibold">R$ {formatCentsToBRLText(totalCents)}</div>
        </div>

        <div className="rounded-xl border bg-background p-3">
          <div className="text-xs text-muted-foreground">Capacidade</div>
          <div className="mt-1 text-lg font-semibold">{fair ? cap.capacity : '—'}</div>
        </div>
      </div>

      {capacityError ? <p className="text-xs text-destructive">{capacityError}</p> : null}
    </Card>
  )
}
