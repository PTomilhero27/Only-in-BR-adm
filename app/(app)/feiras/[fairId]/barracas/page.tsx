"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MapPinned, Store, CheckCircle2, HandCoins, Map, FileText } from "lucide-react";

import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { useFairExhibitorsQuery } from "@/app/modules/fairs/exhibitors/exhibitors.queries";
import type { OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema";
import {
  exhibitorDisplayContact,
  exhibitorDisplayDoc,
  exhibitorDisplayName,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema";
import { useMainContractTemplatesQuery } from "@/app/modules/contratos/document-templates/document-templates.queries";
import { useUpsertFairContractSettingsMutation } from "@/app/modules/contratos/contract-settings/fair-contract-settings.queries";
import { FairStallsFiltersBar } from "./components/fair-stalls-filters-bar";
import { FairStallsTable } from "./components/table/fair-stalls-table";
import { StallsKpiCards } from "./components/stalls-kpi-cards";
import { FairContractSettingsDialog } from "./components/contratos/fair-contract-settings-dialog";
import { SlotMapDialog } from "./components/map/slot-map-dialog";

function fairStatusTone(status?: string | null) {
  if (status === "ATIVA") {
    return "border-transparent bg-[color:var(--brand-green)]/12 text-[color:var(--brand-green)]";
  }

  return "border-border bg-muted text-primary/70";
}

export default function FairStallsPage() {
  const params = useParams<{ fairId?: string }>();
  const hasFairId = typeof params?.fairId === "string" && params.fairId.length > 0;
  const fairIdSafe = hasFairId ? params.fairId! : "";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OwnerFairStatus | "ALL">("ALL");
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const query = useFairExhibitorsQuery(fairIdSafe);
  const templatesQuery = useMainContractTemplatesQuery();
  const upsertContractMutation = useUpsertFairContractSettingsMutation();

  const fairName = query.data?.fair?.name ?? "Feira";
  const fairStatus = query.data?.fair?.status;
  const items = query.data?.items ?? [];
  const contractSettings = query.data?.fair?.contractSettings ?? null;
  const fairTaxes = query.data?.fair?.taxes ?? [];
  const fairMap = query.data?.fair?.map ?? null;

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

      for (const purchase of purchases) {
        for (const installment of purchase.installments ?? []) {
          const due = new Date(installment.dueDate);
          const isOverdue = due < now && !installment.paidAt;
          if (isOverdue) rowOverdue += installment.amountCents ?? 0;
        }
      }

      return acc + rowOverdue;
    }, 0);

    return {
      exhibitors,
      purchased,
      linked,
      doneExhibitors: statusCounts.CONCLUIDO,
      statusCounts,
      stallsCapacity: query.data?.fair?.stallsCapacity ?? null,
      totalSoldCents,
      totalPaidCents,
      totalOpenCents,
      overdueOpenCents,
    };
  }, [items, query.data?.fair]);

  const showMissingFairId = !hasFairId;
  const showError = hasFairId && query.isError;
  const errorMessage =
    (query.error as { message?: string } | null)?.message ??
    String(query.error ?? "Erro desconhecido");

  return (
    <div className="bg-white px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <AppBreadcrumb
          items={[
            { label: "home", href: "/dashboard" },
            { label: `Dashboard ${fairName}`, href: `/feiras/${fairIdSafe}` },
            { label: "Barracas" },
          ]}
        />

        {showMissingFairId ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-4">
            <h1 className="text-xl text-primary">Barracas vinculadas</h1>
            <p className="mt-2 text-sm leading-6 text-primary/70">
              Nao foi possivel identificar o <span className="font-mono">fairId</span> na rota.
            </p>
          </div>
        ) : null}

        {showError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-4">
            <h2 className="text-base text-rose-700">Erro ao carregar expositores</h2>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-rose-700/90">{errorMessage}</pre>
          </div>
        ) : null}

        {!showMissingFairId && !showError ? (
          <>
            <section>
              <div className="flex  items-end justify-between gap-6">
                {/* Texto à esquerda */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-md border border-border bg-muted px-2.5 py-1 text-[11px] text-primary/75">
                      Painel de barracas
                    </Badge>
                    {fairStatus ? (
                      <Badge className={`rounded-md px-2.5 py-1 text-[11px] ${fairStatusTone(fairStatus)}`}>
                        {fairStatus}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-2xl leading-none text-primary sm:text-[2rem]">
                      Barracas vinculadas
                    </h1>
                    <p className="text-sm leading-6 text-primary/58">
                      Controle mapa, contratos, expositores e financeiro em uma leitura mais direta.
                    </p>
                  </div>
                </div>

                {/* KPIs à direita — grid uniforme de 6 colunas */}
                <div className="grid grid-cols-3 gap-2  sm:grid-cols-6">
                  <SummaryPill
                    icon={<Store className="h-4 w-4" />}
                    label="Expositores"
                    value={String(kpis.exhibitors)}
                  />
                  <SummaryPill
                    icon={<MapPinned className="h-4 w-4" />}
                    label="Barracas"
                    value={`${kpis.linked}/${kpis.purchased || 0}`}
                  />
                  <SummaryPill
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Concluidos"
                    value={`${kpis.doneExhibitors}/${kpis.exhibitors || 0}`}
                  />
                  <SummaryPill
                    icon={<HandCoins className="h-4 w-4" />}
                    label="Recebido"
                    value={formatMoneyBRLFromCents(kpis.totalPaidCents)}
                  />
                  <ClickableSummaryPill
                    icon={<Map className="h-4 w-4" />}
                    label="Mapa "
                    accentColor="var(--brand-green)"
                    value={
                      query.isLoading
                        ? "…"
                        : (() => {
                            const elements = fairMap?.template?.elements ?? [];
                            const total = elements.filter((e) => e.type === "BOOTH_SLOT").length;
                            const linked = fairMap?.links?.length ?? 0;
                            return `${linked}/${total || 0}`;
                          })()
                    }
                    disabled={query.isLoading || !fairMap?.id}
                    onClick={() => setMapOpen(true)}
                  />
                  <ClickableSummaryPill
                    icon={<FileText className="h-4 w-4" />}
                    label="Contrato"
                    accentColor="var(--brand-yellow)"
                    value={contractSettings?.template.title ?? "Nenhum"}
                    disabled={query.isLoading}
                    onClick={() => setContractDialogOpen(true)}
                  />
                </div>
              </div>
            </section>

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

            <SlotMapDialog
              open={mapOpen}
              onOpenChange={setMapOpen}
              fairId={fairIdSafe}
              exhibitorName={fairName}
              slotNumber={null}
              slotClientKey={null}
            />

            <StallsKpiCards kpis={kpis} />

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
          </>
        ) : null}
      </div>
    </div>
  );
}

function SummaryPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg w-30 border border-border bg-white px-3 py-2.5 shadow-[0_14px_30px_-28px_rgba(1,0,119,0.12)]">
      <div className="flex items-center gap-1.5 text-primary/48">
        {icon}
        <span className="text-[11px] uppercase">{label}</span>
      </div>
      <div className="mt-1.5 font-display text-base text-primary">{value}</div>
    </div>
  );
}

function ClickableSummaryPill({
  icon,
  label,
  value,
  onClick,
  disabled,
  accentColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group w-30 overflow-hidden rounded-lg border border-border bg-white text-left shadow-[0_14px_30px_-28px_rgba(1,0,119,0.12)] transition-all hover:border-[color:var(--brand-blue)]/30 hover:bg-[color:var(--brand-blue)]/[0.03] hover:shadow-[0_14px_30px_-20px_rgba(1,0,119,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {/* Faixa de cor no topo */}
      <div
        className="h-1 w-full transition-[height] duration-200 group-hover:h-1.5"
        style={{ backgroundColor: accentColor ?? 'var(--brand-blue)' }}
      />
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-primary/48">
          {icon}
          <span className="text-[11px] uppercase">{label}</span>
        </div>
        <div className="mt-1.5 truncate font-display text-base text-primary">{value}</div>
      </div>
    </button>
  );
}

function formatMoneyBRLFromCents(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}
