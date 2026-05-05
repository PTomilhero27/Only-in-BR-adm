"use client";

import { AlertTriangle, AlertCircle, CheckCircle2, CircleMinus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ImportSupplierRow } from "../fair-suppliers.schema";
import { formatDocument, formatMoneyBRLFromCents } from "../fair-suppliers.schema";
import { PixKeyTypeBadge } from "./pix-key-type-badge";
import { ImportRowStatusBadge } from "./import-row-status-badge";
import { ImportedSpreadsheetStatusBadge } from "./imported-spreadsheet-status-badge";
import { SupplierStatusBadge } from "./supplier-status-badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const actionMeta = {
  CREATE: { label: "Cadastrar", icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  UPDATE: { label: "Atualizar", icon: RefreshCw, className: "border-blue-200 bg-blue-50 text-blue-700" },
  SKIP: { label: "Ignorar", icon: CircleMinus, className: "border-muted bg-muted/40 text-primary/60" },
  ERROR: { label: "Erro", icon: AlertTriangle, className: "border-rose-200 bg-rose-50 text-rose-700" },
};

function ErrorsWarningsCell({ errors, warnings }: { errors: string[], warnings: string[] }) {
  const hasErrors = errors && errors.length > 0;
  const hasWarnings = warnings && warnings.length > 0;
  const isClean = !hasErrors && !hasWarnings;

  if (isClean) {
    return <div className="text-xs text-primary/42 text-center">-</div>;
  }

  const Icon = hasErrors ? AlertCircle : AlertTriangle;
  const colorClass = hasErrors 
    ? "text-rose-600 hover:text-rose-700 hover:bg-rose-100 bg-rose-50 border-rose-200" 
    : "text-amber-600 hover:text-amber-700 hover:bg-amber-100 bg-amber-50 border-amber-200";
  const tooltipText = hasErrors ? "Ver erros da linha" : "Ver avisos da linha";

  return (
    <Dialog>
      <div className="flex justify-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <button className={cn("inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors", colorClass)}>
                  <Icon className="h-4 w-4" />
                </button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{hasErrors ? "Erros encontrados" : "Avisos encontrados"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-4 py-2 pr-2">
          {hasErrors && (
            <div className="space-y-2">
              {errors.map((err, i) => (
                <div key={i} className="text-sm text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">
                  {err}
                </div>
              ))}
            </div>
          )}
          {hasWarnings && (
            <div className="space-y-2">
              {hasErrors && <div className="font-medium text-sm text-amber-700 pt-2">Avisos adicionais:</div>}
              {warnings.map((warn, i) => (
                <div key={i} className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  {warn}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button>OK</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ImportSuppliersPreviewTable({ rows }: { rows: ImportSupplierRow[] }) {
  return (
    <div className="flex flex-col min-h-0 overflow-hidden rounded-lg border border-border">
      <div className="max-h-[360px] overflow-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow className="bg-muted/35 hover:bg-muted/35">
              <TableHead>Linha</TableHead>
              <TableHead>Acao</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>PIX</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Planilha</TableHead>
              <TableHead>Sistema</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Erros</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const meta = actionMeta[row.action];
              const Icon = meta.icon;
              const supplier = row.supplier;

              return (
                <TableRow key={row.rowNumber} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("gap-1.5 rounded-full whitespace-nowrap", meta.className)}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate font-medium">{supplier?.name ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDocument(supplier?.document)}</TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="space-y-1">
                      <div className="truncate text-xs font-medium text-primary">{supplier?.pixKey ?? "-"}</div>
                      {supplier?.pixKey ? (
                        <div className="flex items-center gap-1.5">
                          <PixKeyTypeBadge type={supplier?.pixKeyType} />
                          {(supplier as any)?.pixKeyConfidence === "LOW" ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="h-3 w-3 text-amber-600 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Conferir chave PIX</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatMoneyBRLFromCents(supplier?.totalAmountCents)}</TableCell>
                  <TableCell>{supplier?.installments?.length ?? 0}</TableCell>
                  <TableCell>
                    <ImportedSpreadsheetStatusBadge status={(supplier as any)?.importedStatus} />
                  </TableCell>
                  <TableCell>
                    {(supplier as any)?.supplierStatus ? (
                      <SupplierStatusBadge status={(supplier as any).supplierStatus} />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <ImportRowStatusBadge status={row.status as any} />
                  </TableCell>
                  <TableCell>
                    <ErrorsWarningsCell errors={row.errors} warnings={row.warnings} />
                  </TableCell>
                </TableRow>
              );
            })}

            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-sm text-primary/58">
                  Nenhuma linha retornada pela planilha.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
