"use client"

/**
 * Menu de ações por linha (…)
 * Responsabilidade:
 * - Ações rápidas: detalhes, pagamentos, alterar status
 *
 * Decisão:
 * - A ação "Pagamentos" abre o mesmo modal usado pelo chip da coluna.
 */

import * as React from "react"
import type { FairExhibitorRow } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Eye, Pencil, CreditCard, MoreVertical } from "lucide-react"

type Props = {
  row: FairExhibitorRow
  onViewExhibitorDetails: (row: FairExhibitorRow) => void
  onChangeStatus: (row: FairExhibitorRow) => void

  /** ✅ novo: abre modal de pagamentos */
  onOpenPayments: (row: FairExhibitorRow) => void
}

export function FairStallsRowActions({ row, onViewExhibitorDetails, onChangeStatus, onOpenPayments }: Props) {
  const hasPayment = !!row.payment

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Ações">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => onViewExhibitorDetails(row)}>
          <Eye className="mr-2 h-4 w-4" />
          Ver detalhes
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onOpenPayments(row)}
          disabled={!hasPayment}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Pagamentos
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => onChangeStatus(row)}>
          <Pencil className="mr-2 h-4 w-4" />
          Alterar status
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
