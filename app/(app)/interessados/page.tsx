/**
 * Página de Interessados (painel administrativo).
 * Responsabilidade:
 * - Listar cadastros vindos do formulário público (Owner)
 * - Permitir busca rápida via Command Palette ("/")
 * - Abrir modal de detalhes com dados completos e ações
 *
 * Decisão de UX:
 * - A busca principal é via modal (palette) para deixar a tela mais clean.
 * - Ao alterar a busca, voltamos para page=1 para evitar páginas vazias.
 */
"use client"

import { useMemo, useState } from "react"
import { AppBreadcrumb } from "@/components/breadcrumb/app-breadcrumb"

import { InterestedSearchPalette } from "./components/interested-search-palette"
import { InterestedTable } from "./components/interested-table"
import { InterestedDetailsDialog } from "./components/interested-details-dialog"
import { InterestListItem, InterestsFilters } from "@/app/modules/interests/interests.schema"
import { useInterestsListQuery } from "@/app/modules/interests/interests.queries"


export default function InteressadosPage() {
  /**
   * Filtros do endpoint GET /interests.
   * Observação:
   * - q é a busca livre (nome/email/documento/cidade)
   * - paginação e sort ficam aqui para manter URL/state previsível
   */
  const [filters, setFilters] = useState<InterestsFilters>({
    page: 1,
    pageSize: 20,
    sort: "updatedAt_desc",
    q: undefined,
  })

  /**
   * Item selecionado para abrir o modal.
   * Como o backend já retorna o item completo na listagem,
   * o modal não precisa chamar endpoint por id.
   */
  const [selected, setSelected] = useState<InterestListItem | null>(null)

  /**
   * Controle explícito do modal.
   * Mantemos separado do "selected" para permitir fechar/reabrir sem perder seleção
   * caso você queira (ex.: voltar para o mesmo registro).
   */
  const [detailsOpen, setDetailsOpen] = useState(false)

  const { data, isError, isLoading } = useInterestsListQuery(filters)

  // Só abrimos o modal se houver item selecionado
  const canOpen = useMemo(() => Boolean(selected), [selected])

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        <header className="space-y-2">
          <AppBreadcrumb
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Interessados" },
            ]}
          />

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Interessados</h1>
            <p className="text-sm text-muted-foreground">
              Cadastros recebidos pelo formulário público para triagem e gestão.
            </p>
          </div>
        </header>

        {/* Busca rápida (Command Palette).
            Regras:
            - Digitar atualiza filters.q
            - Quando muda q, resetamos page=1
            - Ao limpar (ESC/celular), q vira undefined e a lista volta ao normal
         */}
        <InterestedSearchPalette
          value={filters.q}
          onChangeValue={(q) =>
            setFilters((prev) => ({
              ...prev,
              q: q?.trim() ? q : undefined,
              page: 1,
            }))
          }
        />

        <InterestedTable
          data={data}
          isLoading={isLoading}
          isError={isError}
          onSelect={(item) => {
            setSelected(item)
            setDetailsOpen(true)
          }}
          onPageChange={(page) =>
            setFilters((prev) => ({
              ...prev,
              page,
            }))
          }
          onPageSizeChange={(pageSize) =>
            setFilters((prev) => ({
              ...prev,
              pageSize,
              page: 1,
            }))
          }
        />


        <InterestedDetailsDialog
        listFilters={filters}
          open={detailsOpen && canOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open)
            if (!open) setSelected(null)
          }}
          interest={selected}
        />
      </div>
    </div>
  )
}
