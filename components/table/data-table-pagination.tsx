"use client"

/**
 * Componente de paginação estilo "Rows per page" + setas (< > << >>).
 *
 * Responsabilidades:
 * - Permitir alterar pageSize
 * - Navegar para primeira/anterior/próxima/última página
 *
 * Decisão:
 * - Layout compacto (ícones mais próximos)
 */

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Props = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  isLoading,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 25, 50, 100],
}: Props) {
  const disabled = Boolean(isLoading)
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="flex flex-col gap-3  py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={disabled || !canPrev}
          onClick={() => onPageChange(1)}
          title="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={disabled || !canPrev}
          onClick={() => onPageChange(page - 1)}
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 w-[78px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={disabled || !canNext}
          onClick={() => onPageChange(page + 1)}
          title="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={disabled || !canNext}
          onClick={() => onPageChange(totalPages)}
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
