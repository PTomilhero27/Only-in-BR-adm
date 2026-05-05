"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, CircleDollarSign, HandCoins, Search, WalletCards, X } from "lucide-react";

import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import {
  formatDocument,
  formatMoneyBRLFromCents,
  getDisplaySupplierStatus,
  getSupplierPaidCents,
  getSupplierPendingCents,
  type SupplierStatus,
} from "../fair-suppliers.schema";
import { useFairSuppliersQuery } from "../fair-suppliers.queries";
import { FairSupplierUpsertDialog } from "./fair-supplier-upsert-dialog";
import { FairSuppliersTable } from "./fair-suppliers-table";
import { ImportFairSuppliersDialog } from "./import-fair-suppliers-dialog";
import { SupplierPaymentSummaryCard } from "./supplier-payment-summary-card";

type PixPendingFilter = "ALL" | "MISSING" | "COMPLETE";
type InstallmentsFilter = "ALL" | "1" | "2";

export function FairSuppliersPage({ fairId }: { fairId: string }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<SupplierStatus | "ALL">("ALL");
  const [pixPending, setPixPending] = useState<PixPendingFilter>("ALL");
  const [installments, setInstallments] = useState<InstallmentsFilter>("ALL");

  const query = useFairSuppliersQuery(fairId);
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const fairName = query.data?.fair?.name ?? "Feira";

  const summary = useMemo(() => {
    const totalContracted = items.reduce((acc, supplier) => acc + supplier.totalAmountCents, 0);
    const totalPaid = items.reduce((acc, supplier) => acc + getSupplierPaidCents(supplier), 0);
    const totalPending = items.reduce((acc, supplier) => acc + getSupplierPendingCents(supplier), 0);
    const pendingSuppliers = items.filter((supplier) => getSupplierPendingCents(supplier) > 0).length;
    const pixIncomplete = items.filter((supplier) => !supplier.pixKey || !supplier.pixKeyType).length;

    return {
      totalContracted,
      totalPaid,
      totalPending,
      pendingSuppliers,
      pixIncomplete,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return items.filter((supplier) => {
      const supplierStatus = getDisplaySupplierStatus(supplier);
      const matchesStatus = status === "ALL" || supplierStatus === status;
      const hasPix = !!supplier.pixKey && !!supplier.pixKeyType;
      const matchesPix =
        pixPending === "ALL" || (pixPending === "MISSING" ? !hasPix : hasPix);
      const matchesInstallments =
        installments === "ALL" || supplier.installments.length === Number(installments);

      if (!matchesStatus || !matchesPix || !matchesInstallments) return false;
      if (!term) return true;

      const haystack = [
        supplier.name,
        supplier.document,
        formatDocument(supplier.document),
        supplier.serviceDescription,
        supplier.pixKey,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [installments, items, pixPending, q, status]);

  const showMissingFairId = !fairId;
  const showError = !!fairId && query.isError;

  return (
    <div className="bg-white px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <AppBreadcrumb
          items={[
            { label: "home", href: "/dashboard" },
            { label: `Dashboard ${fairName}`, href: `/feiras/${fairId}` },
            { label: "Fornecedores" },
          ]}
        />

        {showMissingFairId ? (
          <ErrorPanel
            title="Feira nao identificada"
            message="Nao foi possivel identificar o fairId na rota."
          />
        ) : null}

        {showError ? (
          <ErrorPanel
            title="Erro ao carregar fornecedores"
            message={getErrorMessage(query.error)}
          />
        ) : null}

        {!showMissingFairId && !showError ? (
          <>
            <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1.5">
                <h1 className="text-2xl leading-none text-primary sm:text-[2rem]">Fornecedores</h1>
                <p className="text-sm leading-6 text-primary/58">
                  Importe fornecedores a partir da planilha da feira. O sistema valida valores, identifica o tipo da chave PIX e salva os dados no banco para uso nas remessas PIX.
                </p>
                <Alert className="mt-2 border-blue-100 bg-blue-50 text-blue-900">
                  <AlertTitle>Sobre a importação</AlertTitle>
                  <AlertDescription className="text-blue-900/75">
                    Os dados podem ser importados de uma planilha Google Sheets. Após a importação, o sistema passa a ser a fonte oficial para geração de remessas PIX.
                  </AlertDescription>
                </Alert>
              </div>
              <div className="flex flex-wrap gap-2">
                <ImportFairSuppliersDialog fairId={fairId} />
                <FairSupplierUpsertDialog fairId={fairId} />
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SupplierPaymentSummaryCard
                icon={CircleDollarSign}
                label="Total contratado"
                value={formatMoneyBRLFromCents(summary.totalContracted)}
              />
              <SupplierPaymentSummaryCard
                icon={HandCoins}
                label="Total pago"
                value={formatMoneyBRLFromCents(summary.totalPaid)}
                tone="success"
              />
              <SupplierPaymentSummaryCard
                icon={WalletCards}
                label="Total pendente"
                value={formatMoneyBRLFromCents(summary.totalPending)}
                tone={summary.totalPending > 0 ? "warn" : "success"}
              />
              <SupplierPaymentSummaryCard
                icon={Banknote}
                label="Pendentes"
                value={String(summary.pendingSuppliers)}
                helper="Fornecedores com saldo aberto"
              />
              <SupplierPaymentSummaryCard
                icon={AlertTriangle}
                label="PIX incompleto"
                value={String(summary.pixIncomplete)}
                tone={summary.pixIncomplete > 0 ? "danger" : "success"}
              />
            </section>

            <FiltersBar
              q={q}
              onChangeQ={setQ}
              status={status}
              onChangeStatus={setStatus}
              pixPending={pixPending}
              onChangePixPending={setPixPending}
              installments={installments}
              onChangeInstallments={setInstallments}
              onClear={() => {
                setQ("");
                setStatus("ALL");
                setPixPending("ALL");
                setInstallments("ALL");
              }}
            />

            <FairSuppliersTable
              fairId={fairId}
              data={filtered}
              isLoading={query.isLoading}
              isError={query.isError}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function FiltersBar({
  q,
  onChangeQ,
  status,
  onChangeStatus,
  pixPending,
  onChangePixPending,
  installments,
  onChangeInstallments,
  onClear,
}: {
  q: string;
  onChangeQ: (value: string) => void;
  status: SupplierStatus | "ALL";
  onChangeStatus: (value: SupplierStatus | "ALL") => void;
  pixPending: PixPendingFilter;
  onChangePixPending: (value: PixPendingFilter) => void;
  installments: InstallmentsFilter;
  onChangeInstallments: (value: InstallmentsFilter) => void;
  onClear: () => void;
}) {
  return (
    <Card className="border-border bg-white py-0 shadow-[0_20px_48px_-42px_rgba(1,0,119,0.12)]">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <div className="font-display text-base text-primary">Filtrar fornecedores</div>
            <div className="text-sm text-primary/58">
              Busque por nome, documento ou servico e refine pendencias de pagamento.
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:min-w-[920px] xl:grid-cols-[minmax(0,1fr)_170px_190px_150px_auto]">
            <div className="relative sm:col-span-2 xl:col-span-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/34" />
              <Input
                value={q}
                onChange={(event) => onChangeQ(event.target.value)}
                placeholder="Buscar por nome, documento ou servico..."
                className="h-10 rounded-lg border-border bg-muted/45 pl-11 shadow-none"
              />
            </div>

            <Select value={status} onValueChange={(value) => onChangeStatus(value as SupplierStatus | "ALL")}>
              <SelectTrigger className="h-10 w-full rounded-lg border-border bg-white shadow-none">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Parcial</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={pixPending} onValueChange={(value) => onChangePixPending(value as PixPendingFilter)}>
              <SelectTrigger className="h-10 w-full rounded-lg border-border bg-white shadow-none">
                <SelectValue placeholder="PIX" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os PIX</SelectItem>
                <SelectItem value="MISSING">PIX incompleto</SelectItem>
                <SelectItem value="COMPLETE">PIX completo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={installments} onValueChange={(value) => onChangeInstallments(value as InstallmentsFilter)}>
              <SelectTrigger className="h-10 w-full rounded-lg border-border bg-white shadow-none">
                <SelectValue placeholder="Parcelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Parcelas</SelectItem>
                <SelectItem value="1">1 parcela</SelectItem>
                <SelectItem value="2">2 parcelas</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={onClear} className="h-10 rounded-lg">
              <X className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorPanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-4">
      <h2 className="text-base text-rose-700">{title}</h2>
      <pre className="mt-2 whitespace-pre-wrap text-xs text-rose-700/90">{message}</pre>
    </div>
  );
}
