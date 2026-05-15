"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, Eye, FilePenLine, Link2, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  useDeleteFairSupplierMutation,
  useDeleteFairSuppliersMutation,
} from "../fair-suppliers.queries";
import { SupplierStatusBadge } from "./supplier-status-badge";
import { SupplierInstallmentsPreview } from "./supplier-installments-preview";
import { FairSupplierUpsertDialog } from "./fair-supplier-upsert-dialog";
import { PixKeyTypeBadge } from "./pix-key-type-badge";
import { CreatePixRemittanceDialog } from "../../pix-remittances/components/create-pix-remittance-dialog";
import type { PixRemittanceListItem, PixRemittanceMode } from "../../pix-remittances/types";

type Props = {
  fairId: string;
  data: FairSupplier[];
  allSuppliers?: FairSupplier[];
  remittances?: PixRemittanceListItem[];
  isLoading: boolean;
  isError: boolean;
  onDeleteAllSuccess?: () => void;
};

type LinkedRemittance = {
  id: string;
  number?: string | null;
  status?: string | null;
  installments: FairSupplier["installments"];
  source?: PixRemittanceListItem;
};

function getInstallmentRemittanceId(installment: FairSupplier["installments"][number]) {
  const raw = installment as any;
  return (
    installment.remittanceId ??
    raw.pixRemittanceId ??
    raw.remittance?.id ??
    raw.pixRemittance?.id ??
    null
  );
}

function getInstallmentRemittanceStatus(installment: FairSupplier["installments"][number]) {
  const raw = installment as any;
  return (
    installment.remittanceStatus ??
    raw.pixRemittanceStatus ??
    raw.remittance?.status ??
    raw.pixRemittance?.status ??
    null
  );
}

function getLinkedRemittances(
  supplier: FairSupplier,
  pixRemittances: PixRemittanceListItem[] = [],
): LinkedRemittance[] {
  const remittances = new Map<string, LinkedRemittance>();

  pixRemittances.forEach((remittance) => {
    const installments = supplier.installments.filter((installment) =>
      remittance.items.some((item) => item.supplierInstallmentId === installment.id),
    );

    if (!installments.length) return;

    remittances.set(remittance.id, {
      id: remittance.id,
      number: remittance.number ?? remittance.name ?? remittance.fileName ?? null,
      status: remittance.status ?? null,
      installments,
      source: remittance,
    });
  });

  supplier.installments.forEach((installment) => {
    const id = getInstallmentRemittanceId(installment);
    if (!id) return;

    const current = remittances.get(id);
    const status = getInstallmentRemittanceStatus(installment);
    const number = installment.remittanceNumber ?? (installment as any).remittance?.number ?? null;

    if (current) {
      current.installments.push(installment);
      current.status = current.status ?? status;
      current.number = current.number ?? number;
      return;
    }

    remittances.set(id, {
      id,
      number,
      status,
      installments: [installment],
    });
  });

  return Array.from(remittances.values());
}

function getInferredRemittanceStatus(remittance: LinkedRemittance) {
  return (
    remittance.status ??
    (remittance.installments.some((installment) => installment.status === "IN_REMITTANCE")
      ? "GENERATED"
      : null)
  );
}

function getRemittanceItemAmount(remittance: LinkedRemittance, installmentId?: string) {
  if (!installmentId) return undefined;
  return remittance.source?.items.find((item) => item.supplierInstallmentId === installmentId)?.amountCents ?? undefined;
}

function buildRedoSuppliers(allSuppliers: FairSupplier[], remittance: LinkedRemittance): FairSupplier[] {
  const sourceInstallmentIds = new Set(
    remittance.source?.items
      .map((item) => item.supplierInstallmentId)
      .filter((id): id is string => Boolean(id)) ??
      remittance.installments.map((installment) => installment.id).filter((id): id is string => Boolean(id)),
  );

  return allSuppliers.flatMap((supplier) => {
    const installments = supplier.installments
      .filter((installment) => installment.id && sourceInstallmentIds.has(installment.id))
      .map((installment) => ({
        ...installment,
        amountCents: getRemittanceItemAmount(remittance, installment.id) ?? installment.amountCents,
      }));

    if (!installments.length) return [];

    const totalAmountCents = installments.reduce(
      (acc, installment) => acc + (installment.amountCents ?? 0),
      0,
    );

    return {
      ...supplier,
      totalAmountCents,
      pendingAmountCents: totalAmountCents,
      installments,
    };
  });
}

function getRemittanceTotalAmountCents(remittance: LinkedRemittance) {
  return remittance.installments.reduce(
    (acc, installment) => acc + (installment.amountCents ?? 0),
    0,
  );
}

function RedoRemittanceAction({
  fairId,
  allSuppliers,
  remittance,
  variant = "outline",
}: {
  fairId: string;
  allSuppliers: FairSupplier[];
  remittance: LinkedRemittance;
  variant?: "outline" | "ghost";
}) {
  if (getInferredRemittanceStatus(remittance) !== "GENERATED") return null;
  const redoSuppliers = buildRedoSuppliers(allSuppliers, remittance);
  if (!redoSuppliers.length) return null;
  const initialMode =
    remittance.source?.mode === "SPLIT_TWO" || remittance.source?.mode === "SINGLE"
      ? (remittance.source.mode as PixRemittanceMode)
      : undefined;

  return (
    <CreatePixRemittanceDialog
      fairId={fairId}
      suppliers={redoSuppliers}
      redoRemittanceId={remittance.id}
      initialMode={initialMode}
      trigger={
        <Button variant={variant} size="sm" className="h-8">
          Refazer remessa
        </Button>
      }
    />
  );
}

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

export function FairSuppliersTable({
  fairId,
  data,
  allSuppliers = data,
  remittances = [],
  isLoading,
  isError,
  onDeleteAllSuccess,
}: Props) {
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const deleteMutation = useDeleteFairSupplierMutation(fairId);
  const deleteManyMutation = useDeleteFairSuppliersMutation(fairId);

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

  async function handleDeleteAll() {
    if (allSuppliers.length === 0) {
      toast({
        variant: "warning",
        title: "Nenhum fornecedor para remover",
      });
      return;
    }

    try {
      await deleteManyMutation.mutateAsync();
      setDeleteAllOpen(false);
      onDeleteAllSuccess?.();
      toast({
        variant: "success",
        title: "Fornecedores excluídos com sucesso.",
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Não foi possível excluir fornecedores",
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
        <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteAllOpen(true)}
            disabled={
              isLoading ||
              isError ||
              allSuppliers.length === 0 ||
              deleteMutation.isPending ||
              deleteManyMutation.isPending
            }
          >
            <Trash2 className="h-4 w-4" />
            {deleteManyMutation.isPending ? "Excluindo..." : "Excluir todos"}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir todos os fornecedores?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <span className="block">
                  Essa ação vai remover todos os fornecedores/prestadores desta feira,
                  incluindo parcelas que já foram vinculadas a remessas PIX. Remessas
                  vazias também serão removidas e remessas restantes terão os totais
                  recalculados.
                </span>
                <span className="block font-medium text-rose-700">
                  Essa ação não pode ser desfeita.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteManyMutation.isPending}>
                Cancelar
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={deleteManyMutation.isPending}
              >
                {deleteManyMutation.isPending ? "Excluindo..." : "Excluir todos"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                const redoRemittance = getLinkedRemittances(supplier, remittances).find(
                  (remittance) => getInferredRemittanceStatus(remittance) === "GENERATED",
                );

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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">
                              Ja entrou em remessa
                            </Badge>
                            {redoRemittance ? (
                              <RedoRemittanceAction
                                fairId={fairId}
                                allSuppliers={allSuppliers}
                                remittance={redoRemittance}
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <RowActions
                        fairId={fairId}
                        supplier={supplier}
                        allSuppliers={allSuppliers}
                        remittances={remittances}
                        onDelete={() => handleDelete(supplier)}
                        isDeleting={deleteMutation.isPending || deleteManyMutation.isPending}
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
  allSuppliers,
  remittances,
  onDelete,
  isDeleting,
}: {
  fairId: string;
  supplier: FairSupplier;
  allSuppliers: FairSupplier[];
  remittances: PixRemittanceListItem[];
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
      <RemittancesDialog
        fairId={fairId}
        supplier={supplier}
        allSuppliers={allSuppliers}
        remittances={remittances}
      />
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

function RemittancesDialog({
  fairId,
  supplier,
  allSuppliers,
  remittances,
}: {
  fairId: string;
  supplier: FairSupplier;
  allSuppliers: FairSupplier[];
  remittances: PixRemittanceListItem[];
}) {
  const linkedRemittances = useMemo(() => {
    return getLinkedRemittances(supplier, remittances);
  }, [remittances, supplier]);

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
        {linkedRemittances.length ? (
          <div className="space-y-2">
            {linkedRemittances.map((remittance) => {
              const totalAmountCents = getRemittanceTotalAmountCents(remittance);
              const inferredStatus = getInferredRemittanceStatus(remittance);

              return (
              <div
                key={remittance.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-primary">
                    Remessa {remittance.number ?? remittance.id}
                  </div>
                  <div className="text-xs text-primary/55">
                    {remittance.installments.length} parcela(s)
                    {inferredStatus ? ` - ${inferredStatus}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 rounded-full border-indigo-200 bg-indigo-50 text-indigo-700">
                    <Banknote className="h-3 w-3" />
                    {formatMoneyBRLFromCents(totalAmountCents)}
                  </Badge>
                  <RedoRemittanceAction
                    fairId={fairId}
                    allSuppliers={allSuppliers}
                    remittance={remittance}
                  />
                </div>
              </div>
              );
            })}
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
