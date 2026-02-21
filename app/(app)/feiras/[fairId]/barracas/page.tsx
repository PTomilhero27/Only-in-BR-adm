"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";

import { useFairExhibitorsQuery } from "@/app/modules/fairs/exhibitors/exhibitors.queries";
import type { OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema";
import {
  exhibitorDisplayName,
  exhibitorDisplayDoc,
  exhibitorDisplayContact,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema";

import { FairStallsFiltersBar } from "./components/fair-stalls-filters-bar";
import { FairStallsTable } from "./components/table/fair-stalls-table";
import { StallsKpiCards } from "./components/stalls-kpi-cards";

// ✅ UI contrato da feira
import { FairContractSettingsCard } from "./components/contratos/fair-contract-settings-card";
import { FairContractSettingsDialog } from "./components/contratos/fair-contract-settings-dialog";

// ✅ hooks reais (backend)
import { useMainContractTemplatesQuery } from "@/app/modules/contratos/document-templates/document-templates.queries";
import { useUpsertFairContractSettingsMutation } from "@/app/modules/contratos/contract-settings/fair-contract-settings.queries";

// ✅ mapa
import { FairMapPreviewCard } from "./components/map/fair-map-preview-card";
import { SlotMapDialog } from "./components/map/slot-map-dialog";

/**
 * Página: Barracas vinculadas (tabela).
 * Fix de Hooks:
 * - NÃO pode dar return antes de chamar os hooks.
 * - Sempre chamamos hooks com um fairId "safe" (string), e a query usa enabled internamente.
 */
export default function FairStallsPage() {
  const params = useParams<{ fairId?: string }>();
  const hasFairId =
    typeof params?.fairId === "string" && params.fairId.length > 0;
  const fairIdSafe = hasFairId ? params.fairId! : ""; // sempre string

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OwnerFairStatus | "ALL">("ALL");

  // ✅ estado do dialog de contrato
  const [contractDialogOpen, setContractDialogOpen] = useState(false);

  // ✅ estado do modal do mapa
  const [mapOpen, setMapOpen] = useState(false);

  // ✅ hooks SEMPRE chamados (nunca condicional)
  const query = useFairExhibitorsQuery(fairIdSafe);
  const templatesQuery = useMainContractTemplatesQuery();
  const upsertContractMutation = useUpsertFairContractSettingsMutation();

  // ✅ dados com defaults seguros (para não quebrar mesmo sem fairId/sem data)
  const fairName = query.data?.fair?.name ?? "Feira";
  const fairStatus = query.data?.fair?.status;
  const items = query.data?.items ?? [];
  const contractSettings = query.data?.fair?.contractSettings ?? null;
  const fairTaxes = query.data?.fair?.taxes ?? [];
  const fairMap = query.data?.fair?.map ?? null;

  // ✅ useMemo SEMPRE chamado (nunca condicional)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return items.filter((row) => {
      const matchesStatus = status === "ALL" ? true : row.status === status;
      if (!term) return matchesStatus;

      const name = exhibitorDisplayName(row).toLowerCase();
      const doc = exhibitorDisplayDoc(row).toLowerCase();
      const contact = exhibitorDisplayContact(row).toLowerCase();

      return (
        matchesStatus &&
        (name.includes(term) || doc.includes(term) || contact.includes(term))
      );
    });
  }, [items, q, status]);

  const kpis = useMemo(() => {
    const exhibitors = items.length;
    const purchased = items.reduce((acc, i) => acc + i.stallsQtyPurchased, 0);
    const linked = items.reduce((acc, i) => acc + i.stallsQtyLinked, 0);

    const statusCounts = items.reduce(
      (acc, i) => {
        acc[i.status] = (acc[i.status] ?? 0) + 1;
        return acc;
      },
      {
        SELECIONADO: 0,
        AGUARDANDO_PAGAMENTO: 0,
        AGUARDANDO_ASSINATURA: 0,
        AGUARDANDO_BARRACAS: 0,
        CONCLUIDO: 0,
      } as Record<OwnerFairStatus, number>,
    );

    const doneExhibitors = statusCounts.CONCLUIDO;

    // ✅ financeiro
    const totalSoldCents = items.reduce(
      (acc, row) => acc + (row.payment?.totalCents ?? 0),
      0,
    );
    const totalPaidCents = items.reduce(
      (acc, row) => acc + (row.payment?.paidCents ?? 0),
      0,
    );
    const totalOpenCents = Math.max(0, totalSoldCents - totalPaidCents);

    const now = new Date();
    const overdueOpenCents = items.reduce((acc, row) => {
      const purchases = row.purchasesPayments ?? [];
      let rowOverdue = 0;

      for (const p of purchases) {
        const inst = p.installments ?? [];
        for (const it of inst) {
          const due = new Date(it.dueDate);
          const isOverdue = due < now && !it.paidAt;
          if (isOverdue) rowOverdue += it.amountCents ?? 0;
        }
      }

      return acc + rowOverdue;
    }, 0);

    return {
      exhibitors,
      purchased,
      linked,
      doneExhibitors,
      statusCounts,

      stallsCapacity: query.data?.fair?.stallsCapacity ?? null,

      totalSoldCents,
      totalPaidCents,
      totalOpenCents,
      overdueOpenCents,
    };
  }, [items, query.data?.fair]);

  const debugEnabled = process.env.NODE_ENV !== "production";

  // ✅ Render SEM early return antes dos hooks: fazemos condicional aqui dentro
  const showMissingFairId = !hasFairId;
  const showError = hasFairId && query.isError;

  const errorMessage =
    (query.error as any)?.message ?? String(query.error ?? "Erro desconhecido");

  return (
    <div className="p-6 space-y-6">
      <AppBreadcrumb
        items={[
          { label: "home", href: "/dashboard" },
          { label: `Dashboard ${fairName}`, href: `/feiras/${fairIdSafe}` },
          { label: "Barracas" },
        ]}
      />

      {/* ✅ Debug leve */}
      {debugEnabled ? (
        <div className="text-xs text-muted-foreground">
          <span className="font-mono">fairId: {String(params?.fairId)}</span>
          {" · "}
          <span>loading: {String(query.isLoading)}</span>
          {" · "}
          <span>items: {items.length}</span>
        </div>
      ) : null}

      {/* ✅ Caso fairId esteja ausente */}
      {showMissingFairId ? (
        <div className="space-y-3 rounded border p-4">
          <h1 className="text-xl font-semibold">Barracas vinculadas</h1>
          <p className="text-sm text-muted-foreground">
            Não foi possível identificar{" "}
            <span className="font-medium">fairId</span> na rota. Verifique se a
            pasta está como <span className="font-mono">[fairId]</span>.
          </p>
          <pre className="text-xs whitespace-pre-wrap rounded border p-3">
            params = {JSON.stringify(params, null, 2)}
          </pre>
        </div>
      ) : null}

      {/* ✅ Caso tenha erro real (inclui Zod mismatch) */}
      {showError ? (
        <div className="space-y-3 rounded border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-700">
            Erro ao carregar expositores
          </h2>
          <pre className="text-xs whitespace-pre-wrap">{errorMessage}</pre>
        </div>
      ) : null}

      {/* ✅ Conteúdo normal (somente quando tem fairId e não está em erro) */}
      {!showMissingFairId && !showError ? (
        <>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Barracas vinculadas
            </h1>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{fairName}</span>
              {fairStatus ? <span> · {fairStatus}</span> : null}
            </div>
            <Separator />
          </div>

          {/* ✅ Card do mapa */}
          <FairMapPreviewCard
            fairId={fairIdSafe}
            fairName={fairName}
            isLoading={query.isLoading}
            fairMap={fairMap}
            onOpenMap={() => setMapOpen(true)}
            defaultOpen={false} // ou true
          />

          {/* ✅ Contrato vinculado à feira */}
          <FairContractSettingsCard
            fairName={fairName}
            contractSettings={contractSettings}
            isLoading={query.isLoading}
            onOpenDialog={() => setContractDialogOpen(true)}
          />

          <FairContractSettingsDialog
            open={contractDialogOpen}
            onOpenChange={setContractDialogOpen}
            currentTemplateId={contractSettings?.templateId ?? null}
            templates={templatesQuery.data ?? []}
            isLoadingTemplates={templatesQuery.isLoading}
            isSaving={upsertContractMutation.isPending}
            onConfirm={(templateId) => {
              upsertContractMutation.mutate({
                fairId: fairIdSafe,
                input: { templateId },
              });
            }}
          />

          {/* ✅ KPI */}
          <StallsKpiCards kpis={kpis} />

          {/* ✅ Modal do mapa */}
          <SlotMapDialog
            open={mapOpen}
            onOpenChange={setMapOpen}
            fairId={fairIdSafe}
            exhibitorName={fairName}
            slotNumber={null}
            slotClientKey={null}
          />

          {/* ✅ Filtro */}
          <FairStallsFiltersBar
            q={q}
            onChangeQ={setQ}
            status={status}
            onChangeStatus={setStatus}
            onClear={() => {
              setQ("");
              setStatus("ALL");
            }}
          />

          <FairStallsTable
            fairId={fairIdSafe}
            data={filtered}
            isLoading={query.isLoading}
            isError={query.isError}
            fairTaxes={fairTaxes}
          />

          {/* ✅ Debug do payload */}
          {/* {debugEnabled ? (
            <details className="rounded border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Debug: payload /exhibitors
              </summary>
              <pre className="mt-3 text-xs whitespace-pre-wrap">
                {JSON.stringify(query.data, null, 2)}
              </pre>
            </details>
          ) : null} */}
        </>
      ) : null}
    </div>
  );
}
