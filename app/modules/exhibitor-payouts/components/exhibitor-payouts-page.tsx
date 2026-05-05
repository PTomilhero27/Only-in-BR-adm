"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, CircleDollarSign, Search, UserCheck, WalletCards, X } from "lucide-react";

import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/app/shared/utils/get-error-message";
import { SupplierPaymentSummaryCard } from "../../fair-suppliers/components/supplier-payment-summary-card";
import {
  formatDocument,
  formatMoneyBRLFromCents,
  getPayoutAmountCents,
  getPayoutDocument,
  getPayoutName,
  getPayoutPixKey,
} from "../exhibitor-payouts.schema";
import { useExhibitorPayoutsQuery } from "../exhibitor-payouts.queries";
import { ExhibitorPayoutsTable } from "./exhibitor-payouts-table";
import { ImportExhibitorPayoutsDialog } from "./import-exhibitor-payouts-dialog";

export function ExhibitorPayoutsPage({ fairId }: { fairId: string }) {
  const [q, setQ] = useState("");

  const query = useExhibitorPayoutsQuery(fairId);
  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const fairName = query.data?.fair?.name ?? "Feira";

  const summary = useMemo(() => {
    const totalCents = items.reduce((acc, payout) => acc + (getPayoutAmountCents(payout) ?? 0), 0);
    const missingPix = items.filter((payout) => !getPayoutPixKey(payout) || !payout.pixKeyType).length;
    const linkedOwnerFair = items.filter((payout) => !!(payout.ownerFairId || payout.ownerFair?.id)).length;

    return {
      count: items.length,
      totalCents,
      missingPix,
      linkedOwnerFair,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;

    return items.filter((payout) => {
      const haystack = [
        getPayoutName(payout),
        getPayoutDocument(payout),
        formatDocument(getPayoutDocument(payout)),
        getPayoutPixKey(payout),
        payout.pixKeyType,
        payout.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [items, q]);

  const showMissingFairId = !fairId;
  const showError = !!fairId && query.isError;

  return (
    <div className="bg-white px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <AppBreadcrumb
          items={[
            { label: "home", href: "/dashboard" },
            { label: `Dashboard ${fairName}`, href: `/feiras/${fairId}` },
            { label: "Repasses de expositores" },
          ]}
        />

        {showMissingFairId ? (
          <ErrorPanel title="Feira nao identificada" message="Nao foi possivel identificar o fairId na rota." />
        ) : null}

        {showError ? (
          <ErrorPanel title="Erro ao carregar repasses" message={getErrorMessage(query.error)} />
        ) : null}

        {!showMissingFairId && !showError ? (
          <>
            <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex-1 space-y-1.5 pr-4">
                <h1 className="text-2xl leading-none text-primary sm:text-[2rem]">Repasses de expositores</h1>
                <p className="text-sm leading-6 text-primary/58">
                  Importe a planilha de repasses Pix e acompanhe os valores liquidos vinculados aos expositores existentes da feira.
                </p>
                <Alert className="mt-2 border-blue-100 bg-blue-50 text-blue-900">
                  <AlertTitle>Sobre a importacao</AlertTitle>
                  <AlertDescription className="text-blue-900/75">
                    A importacao cria ou atualiza o ExhibitorPayout somente quando encontra um Owner/OwnerFair ja vinculado a feira. Ela nao cadastra expositor novo.
                  </AlertDescription>
                </Alert>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <ImportExhibitorPayoutsDialog fairId={fairId} />
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SupplierPaymentSummaryCard icon={CircleDollarSign} label="Total em repasses" value={formatMoneyBRLFromCents(summary.totalCents)} />
              <SupplierPaymentSummaryCard icon={Banknote} label="Repasses" value={String(summary.count)} />
              <SupplierPaymentSummaryCard icon={UserCheck} label="Vinculados" value={`${summary.linkedOwnerFair}/${summary.count || 0}`} tone="success" />
              <SupplierPaymentSummaryCard
                icon={WalletCards}
                label="PIX incompleto"
                value={String(summary.missingPix)}
                tone={summary.missingPix > 0 ? "danger" : "success"}
              />
            </section>

            <FiltersBar
              q={q}
              onChangeQ={setQ}
              onClear={() => {
                setQ("");
              }}
            />

            <ExhibitorPayoutsTable data={filtered} isLoading={query.isLoading} isError={query.isError} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function FiltersBar({
  q,
  onChangeQ,
  onClear,
}: {
  q: string;
  onChangeQ: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <Card className="border-border bg-white py-0 shadow-[0_20px_48px_-42px_rgba(1,0,119,0.12)]">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <div className="font-display text-base text-primary">Filtrar repasses</div>
            <div className="text-sm text-primary/58">Busque por titular, expositor, documento, chave Pix ou status.</div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[620px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/34" />
              <Input
                value={q}
                onChange={(event) => onChangeQ(event.target.value)}
                placeholder="Buscar repasse..."
                className="h-10 rounded-lg border-border bg-muted/45 pl-11 shadow-none"
              />
            </div>
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
      <div className="flex items-center gap-2 text-rose-700">
        <AlertTriangle className="h-4 w-4" />
        <h2 className="text-base">{title}</h2>
      </div>
      <pre className="mt-2 whitespace-pre-wrap text-xs text-rose-700/90">{message}</pre>
    </div>
  );
}
