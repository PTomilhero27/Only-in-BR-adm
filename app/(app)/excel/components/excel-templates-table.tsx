"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  FileSpreadsheet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table/table";
import { ExcelTemplateListItem, excelScopeLabel } from "@/app/modules/excel/excel.schema";

function StatusBadge({ status }: { status: ExcelTemplateListItem["status"] }) {
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">Ativo</Badge>
    );
  }
  return <Badge variant="secondary">Inativo</Badge>;
}

function ScopeBadge({ scope }: { scope: ExcelTemplateListItem["scope"] }) {
  // leve e “tech”
  return (
    <Badge variant="outline" className="font-normal">
      {excelScopeLabel(scope)}
    </Badge>
  );
}

export function ExcelTemplatesTable(props: {
  items: ExcelTemplateListItem[];
  onEdit: (item: ExcelTemplateListItem) => void;
  onDelete: (item: ExcelTemplateListItem) => void;
  onExport: (item: ExcelTemplateListItem) => void;
  isMutating?: boolean;
}) {
  const { items, onEdit, onDelete, onExport, isMutating } = props;

  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Template</TableHead>
            <TableHead>Escopo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Atualizado em</TableHead>
            <TableHead className="w-[56px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-14">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <div className="h-11 w-11 rounded-2xl border bg-muted/30 grid place-items-center">
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-sm font-medium">Nenhum template encontrado</div>
                  <div className="text-xs text-muted-foreground">
                    Crie um template para começar a gerar relatórios.
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            items.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-9 w-9 rounded-xl border bg-muted/20 grid place-items-center">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>

                    <div className="space-y-1">
                      <div className="font-medium leading-none">{t.name}</div>
                      <div className="text-xs text-muted-foreground">
                        <Link
                          href={`/excel/${t.id}`}
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          Abrir builder
                        </Link>
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <ScopeBadge scope={t.scope} />
                </TableCell>

                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>

                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(t.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </TableCell>

                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={!!isMutating}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href={`/excel/${t.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Abrir builder
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => onEdit(t)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar metadados
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
  );
}
