"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb"

import { useFairExhibitorsQuery } from "@/app/modules/fairs/exhibitors/exhibitors.queries"
import type { OwnerFairStatus } from "@/app/modules/fairs/exhibitors/exhibitors.schema"
import {
  exhibitorDisplayName,
  exhibitorDisplayDoc,
  exhibitorDisplayContact,
} from "@/app/modules/fairs/exhibitors/exhibitors.schema"

import { FairStallsFiltersBar } from "./components/fair-stalls-filters-bar"
import { FairStallsTable } from "./components/table/fair-stalls-table"
import { StallsKpiCards } from "./components/stalls-kpi-cards"

// ✅ UI contrato da feira
import { FairContractSettingsCard } from "./components/contratos/fair-contract-settings-card"
import { FairContractSettingsDialog } from "./components/contratos/fair-contract-settings-dialog"

// ✅ hooks reais (backend)
import { useMainContractTemplatesQuery } from "@/app/modules/contratos/document-templates/document-templates.queries"
import { useUpsertFairContractSettingsMutation } from "@/app/modules/contratos/contract-settings/fair-contract-settings.queries"

/**
 * Página: Barracas vinculadas (tabela).
 * Responsabilidade:
 * - Buscar { fair, items }
 * - Mostrar nome da feira no header
 * - Aplicar filtros locais (q + status single)
 * - Renderizar: Contrato da feira + KPIs + tabela
 *
 * Decisão:
 * - O contrato principal (fair.contractSettings) vem no payload do endpoint de expositores,
 *   evitando uma chamada extra só para "configurações da feira".
 */
export default function FairStallsPage() {
  const { fairId } = useParams<{ fairId: string }>()

  const [q, setQ] = useState("")
  const [status, setStatus] = useState<OwnerFairStatus | "ALL">("ALL")

  // ✅ estado do dialog de contrato
  const [contractDialogOpen, setContractDialogOpen] = useState(false)

  const query = useFairExhibitorsQuery(fairId)

  // ✅ templates reais (somente contrato principal publicado, sem aditivo)
  const templatesQuery = useMainContractTemplatesQuery()

  // ✅ mutation real (salvar vínculo)
  const upsertContractMutation = useUpsertFairContractSettingsMutation()

  const fairName = query.data?.fair?.name ?? "Feira"
  const fairStatus = query.data?.fair?.status
  const items = query.data?.items ?? []

  /**
   * ✅ contrato vinculado (pode ser null)
   * Agora vem tipado via Zod no schema do módulo.
   */
  const contractSettings = query.data?.fair?.contractSettings ?? null

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()

    return items.filter((row) => {
      const matchesStatus = status === "ALL" ? true : row.status === status
      if (!term) return matchesStatus

      const name = exhibitorDisplayName(row).toLowerCase()
      const doc = exhibitorDisplayDoc(row).toLowerCase()
      const contact = exhibitorDisplayContact(row).toLowerCase()

      return (
        matchesStatus &&
        (name.includes(term) || doc.includes(term) || contact.includes(term))
      )
    })
  }, [items, q, status])

  const kpis = useMemo(() => {
    const exhibitors = items.length
    const purchased = items.reduce((acc, i) => acc + i.stallsQtyPurchased, 0)
    const linked = items.reduce((acc, i) => acc + i.stallsQtyLinked, 0)

    const statusCounts = items.reduce(
      (acc, i) => {
        acc[i.status] = (acc[i.status] ?? 0) + 1
        return acc
      },
      {
        SELECIONADO: 0,
        AGUARDANDO_PAGAMENTO: 0,
        AGUARDANDO_ASSINATURA: 0,
        CONCLUIDO: 0,
      } as Record<OwnerFairStatus, number>,
    )

    const doneExhibitors = statusCounts.CONCLUIDO

    return {
      exhibitors,
      purchased,
      linked,
      doneExhibitors,
      statusCounts,

      stallsCapacity: query.data?.fair?.stallsCapacity ?? null,
    }
  }, [items, query.data?.fair])

  return (
    <div className="p-6 space-y-6">
      <AppBreadcrumb
        items={[
          { label: "home", href: "/dashboard" },
          { label: `Dashboard ${fairName}`, href: `/feiras/${fairId}` },
          { label: "Barracas" },
        ]}
      />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Barracas vinculadas</h1>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{fairName}</span>
          {fairStatus ? <span> · {fairStatus}</span> : null}
        </div>
        <Separator />
      </div>

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
            fairId,
            input: { templateId },
          })
        }}
      />

      {/* ✅ KPI */}
      <StallsKpiCards kpis={kpis} />

      {/* ✅ Filtro */}
      <FairStallsFiltersBar
        q={q}
        onChangeQ={setQ}
        status={status}
        onChangeStatus={setStatus}
        onClear={() => {
          setQ("")
          setStatus("ALL")
        }}
      />

      <FairStallsTable
        fairId={fairId}
        data={filtered}
        isLoading={query.isLoading}
        isError={query.isError}
      />
    </div>
  )
}
