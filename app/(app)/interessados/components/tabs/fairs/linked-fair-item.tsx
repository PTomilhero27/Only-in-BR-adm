'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'

/**
 * Item de vínculo existente (Owner↔Fair) na listagem.
 *
 * Responsabilidade:
 * - Mostrar feira, reservas (stallsQty) e status
 * - Permitir editar compras (quando permitido)
 * - Permitir desvincular feira (quando permitido)
 */
export function LinkedFairItem(props: {
  fairId: string
  fairName: string
  stallsQty: number
  status: string
  busy?: boolean
  /** Se existir consumo no portal (usedQty > 0), devemos bloquear edição. */
  canEdit?: boolean
  onEdit?: () => void
  onRemove: () => void
}) {
  const { fairId, fairName, stallsQty, status, busy, canEdit = true, onEdit, onRemove } = props

  return (
    <div className="rounded-2xl border bg-background/50 p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">

          <div className='flex w-full justify-between items-center'>

            <div className='flex items-center'>

              <div className="font-medium truncate">{fairName}</div>

              <Badge variant="secondary" className="rounded-full">
                Reservadas: {stallsQty}
              </Badge>

            </div>

            <div className="flex shrink-0 items-center gap-2">
              {onEdit ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title={canEdit ? 'Editar compras' : 'Não é possível editar após vincular barracas'}
                  onClick={onEdit}
                  disabled={busy || !canEdit}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                title="Desvincular feira"
                onClick={onRemove}
                disabled={busy}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

          </div>

          <div className='flex w-full justify-between'>


            <div className="mt-1 text-xs text-muted-foreground break-all">{fairId}</div>
          </div>

        </div>


      </div>

    </div>
  )
}
