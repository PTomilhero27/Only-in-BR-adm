// src/modules/excel/components/excel-templates-table.tsx
"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { MoreHorizontal, Pencil, Trash2, Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ExcelTemplateListItem } from "@/app/modules/excel/excel.schema"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table/table"




/**
 * Tabela da listagem de templates.
 * Responsabilidade:
 * - Mostrar templates (nome/status/atualização)
 * - Ações: editar (abre builder), editar meta (dialog), exportar (dialog), excluir
 *
 * Decisão:
 * - "Editar template" (builder) é navegação para /excel/:id
 * - "Editar nome/status" fica no dialog de upsert (rápido)
 */
export function ExcelTemplatesTable(props: {
  items: ExcelTemplateListItem[]
  onEdit: (item: ExcelTemplateListItem) => void
  onDelete: (item: ExcelTemplateListItem) => void
  onExport: (item: ExcelTemplateListItem) => void
  isMutating?: boolean
}) {
  const { items, onEdit, onDelete, onExport, isMutating } = props

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Atualizado em</TableHead>
            <TableHead className="w-[56px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                Nenhum template encontrado.
              </TableCell>
            </TableRow>
          ) : (
            items.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <Link href={`/excel/${t.id}`} className="underline underline-offset-2 hover:text-foreground">
                        Abrir builder
                      </Link>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  {t.status === "ACTIVE" ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Ativo</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(t.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={!!isMutating}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/excel/${t.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Abrir builder
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onEdit(t)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar nome/status
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onExport(t)}>
                        <Download className="mr-2 h-4 w-4" />
                        Gerar Excel
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(t)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
