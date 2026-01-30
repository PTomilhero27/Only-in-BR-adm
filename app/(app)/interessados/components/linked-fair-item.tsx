'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

/**
 * Item de vínculo existente (Owner↔Fair) na listagem.
 * Responsabilidade:
 * - Mostrar feira + badge de qty
 * - Expor ações (editar / remover)
 */
export function LinkedFairItem(props: {
  fairId: string
  fairName: string
  stallsQty: number
  busy?: boolean
  onEdit: () => void
  onRemove: () => void
  children?: React.ReactNode // quando estiver “editando”, a gente injeta o editor
}) {
  const { fairId, fairName, stallsQty, busy, onEdit, onRemove, children } = props

  return (
    <div className="rounded-2xl border bg-background/50 p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium truncate">{fairName}</div>
          {!children ? (
            <Badge variant="secondary" className="rounded-full">
              {stallsQty} barraca(s)
            </Badge>
          ) : null}
        </div>

        <div className="mt-1 text-xs text-muted-foreground break-all">{fairId}</div>

        {children ? <div className="mt-4">{children}</div> : null}
      </div>

      {!children ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" title="Editar compra/pagamento" onClick={onEdit} disabled={busy}>
            <Pencil className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon" title="Desvincular" onClick={onRemove} disabled={busy}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
