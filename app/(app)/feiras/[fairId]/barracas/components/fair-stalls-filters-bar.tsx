"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema"

/**
 * Barra de filtros da tabela.
 * Responsabilidade:
 * - Busca por texto
 * - Filtro por status
 */
export function FairStallsFiltersBar({
  q,
  onChangeQ,
  status,
  onChangeStatus,
  onClear,
}: {
  q: string
  onChangeQ: (v: string) => void
  status: OwnerFairStatus | "ALL"
  onChangeStatus: (v: OwnerFairStatus | "ALL") => void
  onClear: () => void
}) {
  return (
    <Card className="border-muted/60">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <Input
              value={q}
              onChange={(e) => onChangeQ(e.target.value)}
              placeholder="Buscar por nome, documento, email ou telefone…"
              className="h-10"
            />

            <Select value={status} onValueChange={(v) => onChangeStatus(v as any)}>
              <SelectTrigger className="h-10 w-[220px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="SELECIONADO">Selecionado</SelectItem>
                <SelectItem value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</SelectItem>
                <SelectItem value="AGUARDANDO_ASSINATURA">Aguardando assinatura</SelectItem>
                <SelectItem value="CONCLUIDO">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="default" onClick={onClear}>
              Limpar filtros
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
