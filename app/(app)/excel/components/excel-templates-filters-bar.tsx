// src/modules/excel/components/excel-templates-filters-bar.tsx
"use client"

import { ExcelTemplateStatus } from "@/app/modules/excel/excel.schema"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/**
 * Barra de filtros da listagem de templates.
 * Responsabilidade:
 * - Filtrar por nome (client-side no MVP)
 * - Filtrar por status (ACTIVE/INACTIVE)
 *
 * Decisão:
 * - MVP filtra no front para simplificar.
 * - Se quiser, depois adicionamos query params no backend.
 */
export function ExcelTemplatesFiltersBar(props: {
  query: string
  onQueryChange: (v: string) => void
  status: ExcelTemplateStatus | "ALL"
  onStatusChange: (v: ExcelTemplateStatus | "ALL") => void
}) {
  const { query, onQueryChange, status, onStatusChange } = props

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        placeholder="Buscar template..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="sm:max-w-sm"
      />

      <Select value={status} onValueChange={(v) => onStatusChange(v as any)}>
        <SelectTrigger className="sm:w-[220px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos</SelectItem>
          <SelectItem value="ACTIVE">Ativo</SelectItem>
          <SelectItem value="INACTIVE">Inativo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
