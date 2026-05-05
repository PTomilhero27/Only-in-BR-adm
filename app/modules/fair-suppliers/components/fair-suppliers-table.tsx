"use client";

import { useMemo } from "react";
import { AlertTriangle, Banknote, Eye, FilePenLine, Link2, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table/table";
import { toast } from "@/components/ui/toast/use-toast";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { cn } from "@/lib/utils";
import {
  formatDocument,
  formatMoneyBRLFromCents,
  getDisplaySupplierStatus,
  getSupplierInstallmentStats,
  getSupplierPaidCents,
  getSupplierPendingCents,
  validateSupplierForPixRemittance,
  type FairSupplier,
} from "../fair-suppliers.schema";
import { useDeleteFairSupplierMutation } from "../fair-suppliers.queries";
import { SupplierStatusBadge } from "./supplier-status-badge";
import { SupplierInstallmentsPreview } from "./supplier-installments-preview";
import { FairSupplierUpsertDialog } from "./fair-supplier-upsert-dialog";
import { PixKeyTypeBadge } from "./pix-key-type-badge";

type Props = {
  fairId: string;
  data: FairSupplier[];
  isLoading: boolean;
  isError: boolean;
};

function TableSkeleton() {
  return (
    <Table className="min-w-[1180px]">
      <TableHeader>
        <TableRow className="bg-muted/35 hover:bg-muted/35">
          {["Fornecedor", "Documento", "Servico", "PIX", "Total", "Parcelas", "Pago", "Falta pagar", "Status", "Acoes"].map(
            (label) => (
              <TableHead key={label}>{label}</TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }).map((_, index) => (
          <TableRow key={index}>
            {Array.from({ length: 10 }).map((__, cellIndex) => (
              <TableCell key={cellIndex}>
                <Skeleton className="h-5 w-full max-w-[140px]" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function FairSuppliersTable({ fairId, data, isLoading, isError }: Props) {
  const deleteMutation = useDeleteFairSupplierMutation(fairId);

  async function handleDelete(supplier: FairSupplier) {
    const allowed = supplier.canDelete ?? true;
    if (!allowed) {
      toast({
        variant: "warning",
        title: "Fornecedor nao pode ser removido",
        description: "Ha vinculos financeiros que impedem a remocao deste cadastro.",
      });
      return;
    }

    if (!window.confirm(`Remover ${supplier.name}?`)) return;

    try {
      await deleteMutation.mutateAsync(supplier.id);
      toast({ variant: "success", title: "Fornecedor removido" });
    } catch (err) {
      toast({
        variant: "error",
        title: "Nao foi possivel remover",
        description: getErrorMessage(err),
      });
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-[0_20px_48px_-42px_rgba(1,0,119,0.12)]">
      <div className="flex flex-col gap-1.5 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <div className="font-display text-base text-primary">Fornecedores vinculados</div>
          <div className="text-sm text-primary/58">
            {isLoading
              ? "Carregando..."
              : isError
                ? "Nao foi possivel carregar fornecedores."
                : `${data.length} registro(s) nesta lista.`}
          </div>
        </div>
      </div>

      <div className="px-1">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <Table className="min-w-[1180px]">
            <TableHeader>
              <TableRow className="bg-muted/35 hover:bg-muted/35">
                <TableHead>Fornecedor</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Servico</TableHead>
                <TableHead>PIX</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Falta pagar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((supplier) => {
                const paid = getSupplierPaidCents(supplier);
                const pending = getSupplierPendingCents(supplier);
                const status = getDisplaySupplierStatus(supplier);
                const stats = getSupplierInstallmentStats(supplier);
                const warnings = validateSupplierForPixRemittance(supplier);
                const pixComplete = supplier.pixKeyType && supplier.pixKey;

                return (
                  <TableRow key={supplier.id} className="hover:bg-muted/20">
                    <TableCell className="max-w-[220px]">
                      <div className="min-w-0 space-y-0.5">
                        <div className="truncate font-medium text-primary">{supplier.name}</div>
                        <div className="truncate text-xs text-primary/50">
                          {[supplier.email, supplier.phone].filter(Boolean).join(" / ") || "Sem contato"}
                        </div>
                        {warnings.length ? <WarningsTooltip warnings={warnings} /> : null}
                      </div>
                    </TableCell>
                    <TableCell>{formatDocument(supplier.document)}</TableCell>
                    <TableCell className="max-w-[210px] truncate">
                      {supplier.serviceDescription || "-"}
                    </TableCell>
                    <TableCell className="max-w-[210px]">
                      {pixComplete ? (
                        <div className="space-y-1">
                          <div className="truncate text-xs font-medium text-primary">{supplier.pixKey}</div>
                          <div className="flex items-center gap-1.5">
                            <PixKeyTypeBadge type={supplier.pixKeyType} />
                            {(supplier as any).pixKeyConfidence === "LOW" ? (
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
                        </div>
                      ) : (
                        <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-amber-700">
                          PIX incompleto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatMoneyBRLFromCents(supplier.totalAmountCents)}</TableCell>
                    <TableCell className="min-w-[220px]">
                      <div className="space-y-1.5">
                        <div className="text-sm font-medium text-primary">
                          {stats.installmentsCount === 1 ? "1 parcela" : "2 parcelas"}
                        </div>
                        <SupplierInstallmentsPreview installments={supplier.installments} compact />
                        <div className="text-xs text-primary/50">
                          {stats.paidInstallmentsCount}/{stats.installmentsCount} pagas
                          {stats.includedInRemittanceCount > 0
                            ? ` - ${stats.includedInRemittanceCount} em remessa`
                            : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatMoneyBRLFromCents(paid)}</TableCell>
                    <TableCell>
                      <div className={cn("font-medium", pending <= 0 ? "text-emerald-700" : "text-primary")}>
                        {pending <= 0 ? "Quitado" : formatMoneyBRLFromCents(pending)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1.5">
                        <SupplierStatusBadge status={status} />
                        {stats.includedInRemittanceCount > 0 ? (
                          <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">
                            Ja entrou em remessa
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <RowActions
                        fairId={fairId}
                        supplier={supplier}
                        onDelete={() => handleDelete(supplier)}
                        isDeleting={deleteMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}

              {!isError && data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center">
                    <div className="text-sm font-medium text-primary">Nenhum fornecedor encontrado</div>
                    <div className="text-xs text-primary/58">
                      Importe a planilha online ou cadastre um fornecedor manualmente.
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function WarningsTooltip({ warnings }: { warnings: string[] }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 rounded-full border-amber-200 bg-amber-50 text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            {warnings.length} alerta(s)
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-[320px]">
          <div className="text-xs font-medium">Validacoes auxiliares para remessa</div>
          <div className="mt-1 space-y-0.5">
            {warnings.map((warning) => (
              <div key={warning} className="text-xs text-muted-foreground">
                {warning}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RowActions({
  fairId,
  supplier,
  onDelete,
  isDeleting,
}: {
  fairId: string;
  supplier: FairSupplier;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <FairSupplierUpsertDialog
        fairId={fairId}
        supplier={supplier}
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar fornecedor">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <InstallmentsDialog supplier={supplier} mode="view" />
      <FairSupplierUpsertDialog
        fairId={fairId}
        supplier={supplier}
        trigger={
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar parcelas">
            <FilePenLine className="h-4 w-4" />
          </Button>
        }
      />
      <RemittancesDialog supplier={supplier} />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-rose-600 hover:text-rose-700"
        title="Cancelar/remover"
        onClick={onDelete}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function InstallmentsDialog({ supplier }: { supplier: FairSupplier; mode: "view" }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver parcelas">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Parcelas de {supplier.name}</DialogTitle>
          <DialogDescription>
            Valores, vencimentos e status usados para preparar pagamentos PIX.
          </DialogDescription>
        </DialogHeader>
        <SupplierInstallmentsPreview installments={supplier.installments} />
      </DialogContent>
    </Dialog>
  );
}

function RemittancesDialog({ supplier }: { supplier: FairSupplier }) {
  const linked = useMemo(() => {
    return supplier.installments.filter((item) => item.remittanceId || item.remittanceNumber);
  }, [supplier.installments]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver remessas vinculadas">
          <Link2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Remessas vinculadas</DialogTitle>
          <DialogDescription>
            Esta tela apenas acompanha vinculos. A geracao da remessa acontece em financeiro/remessas-pix.
          </DialogDescription>
        </DialogHeader>
        {linked.length ? (
          <div className="space-y-2">
            {linked.map((installment) => (
              <div
                key={installment.id ?? installment.number}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-primary">Parcela {installment.number}</div>
                  <div className="text-xs text-primary/55">
                    Remessa {installment.remittanceNumber ?? installment.remittanceId}
                  </div>
                </div>
                <Badge variant="outline" className="gap-1 rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">
                  <Banknote className="h-3 w-3" />
                  {formatMoneyBRLFromCents(installment.amountCents)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-primary/58">
            Nenhuma parcela deste fornecedor entrou em remessa ainda.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
