"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, CircleMinus, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PixKeyTypeBadge } from "../../fair-suppliers/components/pix-key-type-badge";
import { ImportRowStatusBadge } from "../../fair-suppliers/components/import-row-status-badge";
import {
  formatDocument,
  formatMoneyBRLFromCents,
  getImportRowPayout,
  getPayoutAmountCents,
  getPayoutDocument,
  getPayoutName,
  getPayoutPixKey,
  type ImportExhibitorPayoutRow,
} from "../exhibitor-payouts.schema";

const actionMeta = {
  CREATE: { label: "Criar", icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  UPDATE: { label: "Atualizar", icon: RefreshCw, className: "border-blue-200 bg-blue-50 text-blue-700" },
  SKIP: { label: "Ignorar", icon: CircleMinus, className: "border-muted bg-muted/40 text-primary/60" },
  ERROR: { label: "Erro", icon: AlertTriangle, className: "border-rose-200 bg-rose-50 text-rose-700" },
};

function ErrorsWarningsCell({ errors, warnings }: { errors: string[]; warnings: string[] }) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return <div className="text-center text-xs text-primary/42">-</div>;
  }

  const Icon = hasErrors ? AlertCircle : AlertTriangle;
  const colorClass = hasErrors
    ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
    : "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700";

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
              <p>{hasErrors ? "Ver erros da linha" : "Ver avisos da linha"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{hasErrors ? "Erros encontrados" : "Avisos encontrados"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2 pr-2">
          {hasErrors ? (
            <div className="space-y-2">
              {errors.map((err, index) => (
                <div key={`${err}-${index}`} className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {err}
                </div>
              ))}
            </div>
          ) : null}
          {hasWarnings ? (
            <div className="space-y-2">
              {hasErrors ? <div className="pt-2 text-sm font-medium text-amber-700">Avisos adicionais:</div> : null}
              {warnings.map((warning, index) => (
                <div key={`${warning}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
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

export function ImportExhibitorPayoutsPreviewTable({ rows }: { rows: ImportExhibitorPayoutRow[] }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border">
      <div className="max-h-[380px] overflow-auto">
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow className="bg-muted/35 hover:bg-muted/35">
              <TableHead>Linha</TableHead>
              <TableHead>Acao</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expositor / titular</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Chave Pix</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-center">Erros / avisos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const meta = actionMeta[row.action] ?? actionMeta.ERROR;
              const Icon = meta.icon;
              const payout = getImportRowPayout(row);
              const pixKey = getPayoutPixKey(payout);
              const amountCents = getPayoutAmountCents(payout);

              return (
                <TableRow key={row.rowNumber} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("gap-1.5 rounded-full whitespace-nowrap", meta.className)}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ImportRowStatusBadge status={row.status as any} />
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate font-medium">{getPayoutName(payout)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDocument(getPayoutDocument(payout))}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs font-medium text-primary">{pixKey ?? "-"}</TableCell>
                  <TableCell>
                    <PixKeyTypeBadge type={(payout?.pixKeyType ?? row.pixKeyType) as any} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatMoneyBRLFromCents(amountCents)}</TableCell>
                  <TableCell>
                    <ErrorsWarningsCell errors={row.errors} warnings={row.warnings} />
                  </TableCell>
                </TableRow>
              );
            })}

            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-primary/58">
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
