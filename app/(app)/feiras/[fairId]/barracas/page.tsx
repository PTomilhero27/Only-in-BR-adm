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
import { FairStallsTable } from "./components/fair-stalls-table"
import { StallsKpiCards } from "./components/stalls-kpi-cards"

/**
 * Página: Barracas vinculadas (tabela).
 * Responsabilidade:
 * - Buscar { fair, items }
 * - Mostrar nome da feira no header
 * - Aplicar filtros locais (q + status single)
 * - Renderizar KPIs + tabela
 */
export default function FairStallsPage() {
  const { fairId } = useParams<{ fairId: string }>()

  const [q, setQ] = useState("")
  const [status, setStatus] = useState<OwnerFairStatus | "ALL">("ALL")

  const query = useFairExhibitorsQuery(fairId)

  const fairName = query.data?.fair?.name ?? "Feira"
  const fairStatus = query.data?.fair?.status
  const items = query.data?.items ?? []

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

      // 🔜 futuro (quando você adicionar na Fair):
      stallsCapacity: (query.data?.fair as any)?.stallsCapacity ?? null,
      exhibitorsLimit: (query.data?.fair as any)?.exhibitorsLimit ?? null,
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

      {/* ✅ KPI (accordion global + mini-card de barracas no Concluídos) */}
      <StallsKpiCards kpis={kpis} />

      {/* ✅ Filtro single bonito */}
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

      <FairStallsTable fairId={fairId} data={filtered} isLoading={query.isLoading} isError={query.isError} />
    </div>
  )
}
